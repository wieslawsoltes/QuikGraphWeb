using System.Text.Json;
using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;
namespace QuikGraphWeb.Blazor;

public sealed record GraphVertex(string Id, string? Label = null, object? Value = null);
public sealed record GraphEdge(string Id, string Source, string Target, double Weight = 1, string? Label = null, object? Value = null);
public sealed record GraphSnapshot(bool Directed, GraphVertex[] Vertices, GraphEdge[] Edges);
public sealed record GraphPath(bool Found, double? Distance, string[] Vertices, string[] Edges);
public sealed record GraphComponents(int Count, Dictionary<string, int> Components);
public sealed class GraphProvider : BrowserProvider { }
public sealed class QuikGraphModule(IJSRuntime js) : BrowserModule(js)
{
    public ValueTask<GraphModel> CreateGraphAsync(GraphSnapshot snapshot) => GraphModel.CreateAsync(this, snapshot);
}
/// <summary>A native graph with stable string identities for safe .NET/JavaScript round-trips.</summary>
public sealed class GraphModel : IAsyncDisposable
{
    public BrowserModule Module { get; }
    public IJSObjectReference Handle { get; }
    private int _disposed;
    private GraphModel(BrowserModule module, IJSObjectReference handle) { Module = module; Handle = handle; }
    public static async ValueTask<GraphModel> CreateAsync(BrowserModule module, GraphSnapshot snapshot) => new(module, await module.CreateAsync("BlazorGraph", [snapshot]));
    public ValueTask<IJSObjectReference> GetNativeGraphAsync() => Module.GetAsync<IJSObjectReference>(Handle, "Graph");
    public ValueTask<GraphSnapshot> GetSnapshotAsync() => Module.CallAsync<GraphSnapshot>(Handle, "GetSnapshot");
    public ValueTask LoadAsync(GraphSnapshot snapshot) => Module.CallVoidAsync(Handle, "Load", [snapshot]);
    public ValueTask AddVertexAsync(GraphVertex vertex) => Module.CallVoidAsync(Handle, "AddVertex", [vertex]);
    public ValueTask AddEdgeAsync(GraphEdge edge) => Module.CallVoidAsync(Handle, "AddEdge", [edge]);
    public ValueTask<bool> RemoveVertexAsync(string id) => Module.CallAsync<bool>(Handle, "RemoveVertex", [id]);
    public ValueTask<bool> RemoveEdgeAsync(string id) => Module.CallAsync<bool>(Handle, "RemoveEdge", [id]);
    public ValueTask<GraphPath> ShortestPathAsync(string source, string target, string algorithm = "dijkstra") => Module.CallAsync<GraphPath>(Handle, "ShortestPath", [source, target, algorithm]);
    public ValueTask<GraphComponents> ComponentsAsync(bool strong = false) => Module.CallAsync<GraphComponents>(Handle, "Components", [strong]);
    public ValueTask<string> RenderGraphvizAsync(object? options = null) => Module.CallAsync<string>(Handle, "RenderGraphviz", [options ?? new { }]);
    public ValueTask<BrowserSubscription> ObserveChangesAsync(Func<JsonElement, Task> next) => Module.SubscribeAsync(Handle, "dom:changed", next);
    public async ValueTask DisposeAsync()
    {
        if (Interlocked.Exchange(ref _disposed, 1) != 0) return;
        try { await Module.ReleaseAsync(Handle); }
        catch (ObjectDisposedException) { await Handle.DisposeAsync(); }
        catch (JSDisconnectedException) { }
    }
}
/// <summary>Native accessible graph viewer with pan/zoom/drag, layouts, selection and SVG export.</summary>
public sealed class GraphViewer : BrowserComponent
{
    [Parameter] public IReadOnlyList<GraphVertex> Vertices { get; set; } = [];
    [Parameter] public IReadOnlyList<GraphEdge> Edges { get; set; } = [];
    [Parameter] public bool Directed { get; set; } = true;
    [Parameter] public GraphModel? Model { get; set; }
    [Parameter] public IJSObjectReference? Graph { get; set; }
    [Parameter] public string LayoutMode { get; set; } = "circle";
    protected override IReadOnlyList<string> DefaultEvents => ["dom:graph-select-vertex", "dom:graph-select-edge", "dom:graph-layout-change", "dom:graph-create-vertex", "dom:graph-delete-vertex", "dom:graph-delete-edge"];
    protected override Dictionary<string, object?> BuildOptions()
    {
        var values = base.BuildOptions(); values["vertices"] = Vertices; values["edges"] = Edges; values["directed"] = Directed;
        values["model"] = Model?.Handle; values["graph"] = Graph; values["layoutMode"] = LayoutMode; return values;
    }
    public ValueTask FitAsync() => InvokeVoidAsync("Fit");
    public ValueTask ZoomAsync(double factor) => InvokeVoidAsync("Zoom", factor);
    public ValueTask SelectVertexAsync(string id) => InvokeVoidAsync("SelectVertex", id);
    public ValueTask<string> ExportSvgAsync() => InvokeAsync<string>("ToSvg");
    public ValueTask<GraphPath> ShortestPathAsync(string source, string target, string algorithm = "dijkstra") => InvokeAsync<GraphPath>("ShortestPath", source, target, algorithm);
    public ValueTask HighlightAsync(IEnumerable<string> edgeIds) => InvokeVoidAsync("Highlight", edgeIds);
    public ValueTask<JsonElement> ApplyMsaglLayoutAsync(object? options = null) => InvokeAsync<JsonElement>("ApplyMsaglLayout", options ?? new { algorithm = "Sugiyama" });
    public ValueTask CancelLayoutAsync() => InvokeVoidAsync("CancelLayout");
}
