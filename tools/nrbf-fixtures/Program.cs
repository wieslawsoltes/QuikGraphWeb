using System.Collections;
using System.Reflection;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Formatters.Binary;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using QuikGraph;
using QuikGraph.Collections;
using QuikGraph.Graphviz.Dot;
using QuikGraph.Serialization.Tests;

// This reference tool handles only fixtures constructed below and bytes emitted by
// the companion JavaScript interop test. It is not a general BinaryFormatter reader.
var output = Path.GetFullPath(args.ElementAtOrDefault(1) ?? "test/fixtures/nrbf");
var mode = args.ElementAtOrDefault(0) ?? "generate";
var json = new JsonSerializerOptions { WriteIndented = true };
var cases = new Dictionary<string, object>();
void Add(string name, object value) => cases.Add(name, value);

var adjacency = new AdjacencyGraph<int, EquatableEdge<int>>(true, 4, 3);
adjacency.AddVertexRange(new[] { 0, 1, 2, 9 });
adjacency.AddEdgeRange(new[] { new EquatableEdge<int>(0, 1), new(0, 1), new(1, 2), new(2, 2) });
var bidirectional = new BidirectionalGraph<int, EquatableEdge<int>>(true);
bidirectional.AddVertexRange(adjacency.Vertices); bidirectional.AddEdgeRange(adjacency.Edges);
var undirected = new UndirectedGraph<int, EquatableEdge<int>>(true);
undirected.AddVertexRange(adjacency.Vertices); undirected.AddEdgeRange(adjacency.Edges);
var matrix = new BidirectionalMatrixGraph<EquatableEdge<int>>(4);
matrix.AddEdgeRange(new[] { new EquatableEdge<int>(0, 1), new(1, 2), new(2, 2) });
var cluster = new ClusteredAdjacencyGraph<int, EquatableEdge<int>>(new AdjacencyGraph<int, EquatableEdge<int>>(true));
cluster.AddVertex(9); var child = cluster.AddCluster(); child.AddVerticesAndEdge(new EquatableEdge<int>(0, 1));
var grandchild = child.AddCluster(); grandchild.AddVerticesAndEdge(new EquatableEdge<int>(1, 2));
var edgeListGraph = new EdgeListGraph<int, EquatableEdge<int>>(true, true); edgeListGraph.AddEdgeRange(adjacency.Edges); Add("edge-list-graph-int", edgeListGraph);
Add("adjacency-int", adjacency);
Add("array-adjacency-int", new ArrayAdjacencyGraph<int, EquatableEdge<int>>(adjacency));
Add("bidirectional-int", bidirectional);
Add("array-bidirectional-int", new ArrayBidirectionalGraph<int, EquatableEdge<int>>(bidirectional));
Add("bidirectional-adapter-int", new BidirectionalAdapterGraph<int, EquatableEdge<int>>(adjacency));
Add("reversed-bidirectional-int", new ReversedBidirectionalGraph<int, EquatableEdge<int>>(bidirectional));
Add("undirected-bidirectional-int", new UndirectedBidirectionalGraph<int, EquatableEdge<int>>(bidirectional));
Add("undirected-int", undirected);
Add("array-undirected-int", new ArrayUndirectedGraph<int, EquatableEdge<int>>(undirected));
Add("matrix-int", matrix);
Add("compressed-int", CompressedSparseRowGraph<int>.FromGraph(adjacency));
Add("clustered-int", cluster);
Add("adjacency-empty", new AdjacencyGraph<int, EquatableEdge<int>>(false));
var strings = new AdjacencyGraph<string, TaggedEdge<string, double>>(false);
strings.AddVertex("isolated"); strings.AddVerticesAndEdge(new TaggedEdge<string, double>("α", "β", 2.5));
strings.AddVerticesAndEdge(new TaggedEdge<string, double>("β", "emoji😀", -0.25));
Add("adjacency-string-tagged", strings);
Add("edge-int", new Edge<int>(10, 20));
Add("edge-string", new Edge<string>("α", "emoji😀"));
Add("equatable-edge-int", new EquatableEdge<int>(10, 20));
Add("undirected-edge-int", new UndirectedEdge<int>(10, 20));
Add("equatable-undirected-edge-int", new EquatableUndirectedEdge<int>(10, 20));
Add("tagged-edge-int", new TaggedEdge<int, string>(10, 20, "weight"));
Add("tagged-undirected-edge-int", new TaggedUndirectedEdge<int, string>(10, 20, "weight"));
Add("equatable-tagged-edge-int", new EquatableTaggedEdge<int, string>(10, 20, "weight"));
Add("term-edge-int", new TermEdge<int>(10, 20, 3, 4));
Add("equatable-term-edge-int", new EquatableTermEdge<int>(10, 20, 3, 4));
Add("s-edge-int", new SEdge<int>(10, 20));
Add("s-equatable-edge-int", new SEquatableEdge<int>(10, 20));
Add("s-undirected-edge-int", new SUndirectedEdge<int>(10, 20));
Add("s-tagged-edge-int", new STaggedEdge<int, string>(10, 20, "weight"));
Add("s-equatable-tagged-edge-int", new SEquatableTaggedEdge<int, string>(10, 20, "weight"));
Add("s-tagged-undirected-edge-int", new STaggedUndirectedEdge<int, string>(10, 20, "weight"));
Add("s-reversed-edge-int", new SReversedEdge<int, EquatableEdge<int>>(new EquatableEdge<int>(10, 20)));
Add("graphviz-color", new GraphvizColor(128, 10, 20, 30));
Add("graphviz-size", new GraphvizSize(12, 34));
Add("graphviz-size-f", new GraphvizSizeF(1.25f, 2.5f));
Add("vertex-list", new VertexList<int> { 5, 8, 13 });
Add("edge-list", new EdgeList<int, EquatableEdge<int>> { new(0, 1), new(1, 2) });
var queue = new QuikGraph.Collections.Queue<int>(); queue.Enqueue(3); queue.Enqueue(5); queue.Enqueue(8); queue.Dequeue(); Add("queue", queue);
var sets = new ForestDisjointSet<int>(); foreach (var i in new[] { 0, 1, 2, 3 }) sets.MakeSet(i); sets.Union(0, 1); sets.Union(2, 3); Add("forest-disjoint-set", sets);
var vertexEdges = new VertexEdgeDictionary<int, EquatableEdge<int>> { [1] = new EdgeList<int, EquatableEdge<int>> { new(1, 2) }, [2] = new EdgeList<int, EquatableEdge<int>>() }; Add("vertex-edge-dictionary", vertexEdges);
var edgeEdges = new EdgeEdgeDictionary<int, EquatableEdge<int>> { [new(0, 1)] = new(1, 0) }; Add("edge-edge-dictionary", edgeEdges);
Add("negative-cycle-exception", new NegativeCycleGraphException("negative cycle", new InvalidOperationException("inner")));
Add("non-acyclic-exception", new NonAcyclicGraphException("cycle"));
Add("non-strongly-connected-exception", new NonStronglyConnectedGraphException("disconnected"));
Add("parallel-edge-exception", new ParallelEdgeNotAllowedException("parallel"));
Add("vertex-not-found-exception", new VertexNotFoundException("missing"));
Add("no-path-exception", new NoPathFoundException("no path"));
Add("primitive-array", new object[] { true, (byte)255, (sbyte)-4, (short)-32000, (ushort)65000, 42, uint.MaxValue, long.MinValue, ulong.MaxValue, 1.25f, -2.5d, 123.456m, 'Ω', "unicode😀", DateTime.SpecifyKind(new DateTime(2020, 2, 3, 4, 5, 6), DateTimeKind.Utc), TimeSpan.FromTicks(-1234567), null!, new[] { 1, 2, 3 }, new object[] { null!, null!, "last" } });
var cyclic = new object[3]; cyclic[0] = cyclic; cyclic[1] = adjacency; cyclic[2] = adjacency; Add("identity-cycles", cyclic);

var customA = new EquatableTestVertex("alpha") { String = "name α", Int = 7, Long = 9007199254740993L, Bool = true, Double = 1.5, Float = 2.25f, IntArray = new[] { 1, 2 }, IntIList = new List<int> { 3, 4 } };
var customB = new EquatableTestVertex("beta") { String = "name β", Int = -3, Long = -9007199254740993L, Bool = false, Double = -2.5, Float = -4.25f };
var customC = new EquatableTestVertex("isolated");
var customEdge = new EquatableTestEdge(customA, customB, "edge-αβ") { String = "payload", Int = 12, Long = 21L, Double = 3.125, Float = 0.5f, Bool = true };
var custom = new AdjacencyGraph<EquatableTestVertex, EquatableTestEdge>(true); custom.AddVertexRange(new[] { customA, customB, customC }); custom.AddEdgeRange(new[] { customEdge, customEdge, new EquatableTestEdge(customB, customB, "loop") });
var customBi = new BidirectionalGraph<EquatableTestVertex, EquatableTestEdge>(true); customBi.AddVertexRange(custom.Vertices); customBi.AddEdgeRange(custom.Edges);
var customUn = new UndirectedGraph<EquatableTestVertex, EquatableTestEdge>(true); customUn.AddVertexRange(custom.Vertices); customUn.AddEdgeRange(custom.Edges);
var customCluster = new ClusteredAdjacencyGraph<EquatableTestVertex, EquatableTestEdge>(new AdjacencyGraph<EquatableTestVertex, EquatableTestEdge>()); customCluster.AddVertex(customC); customCluster.AddCluster().AddVerticesAndEdge(customEdge);
var customEdgeList = new EdgeListGraph<EquatableTestVertex, EquatableTestEdge>(); customEdgeList.AddEdgeRange(custom.Edges);
Add("adjacency-custom", custom);
Add("array-adjacency-custom", new ArrayAdjacencyGraph<EquatableTestVertex, EquatableTestEdge>(custom));
Add("bidirectional-custom", customBi);
Add("array-bidirectional-custom", new ArrayBidirectionalGraph<EquatableTestVertex, EquatableTestEdge>(customBi));
Add("bidirectional-adapter-custom", new BidirectionalAdapterGraph<EquatableTestVertex, EquatableTestEdge>(custom));
Add("reversed-bidirectional-custom", new ReversedBidirectionalGraph<EquatableTestVertex, EquatableTestEdge>(customBi));
Add("undirected-custom", customUn);
Add("array-undirected-custom", new ArrayUndirectedGraph<EquatableTestVertex, EquatableTestEdge>(customUn));
Add("undirected-bidirectional-custom", new UndirectedBidirectionalGraph<EquatableTestVertex, EquatableTestEdge>(customBi));
Add("clustered-custom", customCluster);
Add("compressed-custom", CompressedSparseRowGraph<EquatableTestVertex>.FromGraph(custom));
Add("edge-list-graph-custom", customEdgeList);
Add("multidimensional-array", new int[,] { { 1, 2, 3 }, { 4, 5, 6 } });
var offset = Array.CreateInstance(typeof(string), new[] { 2, 3 }, new[] { -2, 5 }); offset.SetValue("first", -2, 5); offset.SetValue("last", -1, 7); Add("offset-array", offset);

Add("array-boolean", new[] { true, false, true });
Add("array-byte", new byte[] { 0, 1, 255 });
Add("array-sbyte", new sbyte[] { -128, 0, 127 });
Add("array-char", new[] { '\0', 'a', 'Ω', '中' });
Add("array-int16", new short[] { short.MinValue, 0, short.MaxValue });
Add("array-uint16", new ushort[] { 0, 1, ushort.MaxValue });
Add("array-int32", new[] { int.MinValue, 0, int.MaxValue });
Add("array-uint32", new[] { 0u, 1u, uint.MaxValue });
Add("array-int64", new[] { long.MinValue, 0, long.MaxValue });
Add("array-uint64", new[] { 0ul, 1ul, ulong.MaxValue });
Add("array-single", new[] { float.NegativeInfinity, -0f, float.Epsilon, float.MaxValue, float.PositiveInfinity, float.NaN });
Add("array-double", new[] { double.NegativeInfinity, -0d, double.Epsilon, double.MaxValue, double.PositiveInfinity, double.NaN });
Add("array-decimal", new[] { decimal.MinValue, 0m, 1.0000000000000000000000000001m, decimal.MaxValue });
Add("array-datetime", new[] { DateTime.MinValue, new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc), new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Local), DateTime.MaxValue });
Add("array-timespan", new[] { TimeSpan.MinValue, TimeSpan.Zero, TimeSpan.MaxValue });

Add("decimal-root", 123.456m);
Add("datetime-root", DateTime.SpecifyKind(new DateTime(2020, 2, 3, 4, 5, 6), DateTimeKind.Utc));
Add("timespan-root", TimeSpan.FromTicks(-1234567));
var doubles = new AdjacencyGraph<double, TaggedEdge<double, double>>(); doubles.AddVertexRange(new[] { 1d, 2.5d, 4d }); doubles.AddEdgeRange(new[] { new TaggedEdge<double, double>(1, 2.5, 1), new TaggedEdge<double, double>(2.5, 4, 1.25) }); Add("adjacency-double-tagged", doubles);
Add("vertex-list-empty", new VertexList<int>());
Add("edge-list-empty", new EdgeList<int, Edge<int>>());
Add("edge-list-equatable-empty", new EdgeList<int, EquatableEdge<int>>());
Add("queue-empty", new QuikGraph.Collections.Queue<int>());
var binder = new FixtureBinder();
var serialized = new Dictionary<string, byte[]>();
var failures = new Dictionary<string, string>();
foreach (var (name, value) in cases)
{
    try
    {
        using var stream = new MemoryStream(); new BinaryFormatter { Binder = binder }.Serialize(stream, value);
        var bytes = stream.ToArray(); stream.Position = 0;
        var copy = new BinaryFormatter { Binder = binder }.Deserialize(stream);
        if (copy.GetType() != value.GetType()) throw new Exception("Root type changed.");
        if (JsonSerializer.Serialize(Snapshot(copy), json) != JsonSerializer.Serialize(Snapshot(value), json)) throw new Exception("Roundtrip snapshot changed.");
        serialized.Add(name, bytes);
    }
    catch (Exception e) { failures.Add(name, e.GetType().Name + ": " + e.Message); }
}
if (mode == "generate")
{
    Directory.CreateDirectory(output);
    foreach (var (name, bytes) in serialized) File.WriteAllBytes(Path.Combine(output, name + ".nrbf"), bytes);
    var manifest = new { upstreamCommit = "9cd6b49292e09041258708a37bed99c56177b0ef", runtime = Environment.Version.ToString(), sdk = Assembly.GetExecutingAssembly().GetCustomAttributes<AssemblyMetadataAttribute>().FirstOrDefault(a => a.Key == "BuildSdkVersion")?.Value, coreAssembly = typeof(AdjacencyGraph<,>).Assembly.FullName, graphvizAssembly = typeof(GraphvizColor).Assembly.FullName,
        fixtures = serialized.Select(p => new { name = p.Key, file = p.Key + ".nrbf", bytes = p.Value.Length, sha256 = Convert.ToHexString(SHA256.HashData(p.Value)).ToLowerInvariant(), clrType = cases[p.Key].GetType().FullName, expected = Snapshot(cases[p.Key]) }), unsupportedByReferenceRuntime = failures };
    File.WriteAllText(Path.Combine(output, "manifest.json"), JsonSerializer.Serialize(manifest, json) + "\n");
    var schemas = new SchemaCollector(); foreach (var name in serialized.Keys) schemas.Visit(cases[name]);
    File.WriteAllText(Path.Combine(output, "clr-schemas.json"), JsonSerializer.Serialize(schemas.Schemas.OrderBy(x => x.Key).ToDictionary(), json) + "\n");
    Console.WriteLine($"Generated {serialized.Count} genuine .NET fixtures; {failures.Count} reference-runtime limitations.");
    foreach (var failure in failures) Console.WriteLine(failure.Key + ": " + failure.Value);
}
else if (mode == "verify")
{
    var count = 0; var verifyFailures = new List<string>();
    foreach (var file in Directory.GetFiles(output, "*.nrbf").OrderBy(p => p))
    {
        var name = Path.GetFileNameWithoutExtension(file);
        if (!cases.TryGetValue(name, out var expected)) throw new Exception("Unknown generated fixture " + name);
        try {
        using var input = File.OpenRead(file); var copy = new BinaryFormatter { Binder = binder }.Deserialize(input);
        if (copy.GetType() != expected.GetType()) throw new Exception(name + ": root type changed.");
        if (JsonSerializer.Serialize(Snapshot(copy), json) != JsonSerializer.Serialize(Snapshot(expected), json)) throw new Exception(name + ": snapshot differs: " + JsonSerializer.Serialize(Snapshot(copy), json));
        Console.WriteLine("Verified JS → .NET " + name); count++;
        } catch (Exception e) { verifyFailures.Add(name + ": " + e.GetType().Name + ": " + e.Message); }
    }
    if (count == 0) throw new Exception("No fixtures to verify.");
    Console.WriteLine($"Verified {count} JavaScript-generated fixtures in .NET {Environment.Version}; {verifyFailures.Count} failed.");
    foreach (var error in verifyFailures) Console.Error.WriteLine(error);
    if (verifyFailures.Count > 0) Environment.ExitCode = 1;
}
else throw new ArgumentException("Usage: generate|verify <directory>");

static object? Snapshot(object? value)
{
    if (value == null) return null;
    var type = value.GetType();
    if (value is EquatableTestVertex vertex) return new { id = vertex.ID, text = vertex.String, number = vertex.Int, integer64 = vertex.Long.ToString(), boolean = vertex.Bool, single = vertex.Float, number64 = vertex.Double, array = vertex.IntArray, list = vertex.IntIList };
    if (value is IVertexSet<EquatableTestVertex> customVertices && type.GetProperty("Edges") is PropertyInfo cep)
    {
        var result = new Dictionary<string, object?> { ["vertices"] = customVertices.Vertices.Select(Snapshot), ["edges"] = ((IEnumerable)cep.GetValue(value)!).Cast<object>().Select(Snapshot), ["directed"] = type.GetProperty("IsDirected")!.GetValue(value), ["parallel"] = type.GetProperty("AllowParallelEdges")!.GetValue(value) };
        if (value is ClusteredAdjacencyGraph<EquatableTestVertex, EquatableTestEdge> customClusters) result["clusters"] = customClusters.Clusters.Cast<object>().Select(Snapshot);
        return result;
    }
    if (value is IVertexSet<int> ints && type.GetProperty("Edges") is PropertyInfo ep)
    {
        var result = new Dictionary<string, object?> { ["vertices"] = ints.Vertices, ["edges"] = ((IEnumerable)ep.GetValue(value)!).Cast<object>().Select(Snapshot), ["directed"] = type.GetProperty("IsDirected")!.GetValue(value), ["parallel"] = type.GetProperty("AllowParallelEdges")!.GetValue(value) };
        if (value is ClusteredAdjacencyGraph<int, EquatableEdge<int>> clusters) result["clusters"] = clusters.Clusters.Cast<object>().Select(Snapshot);
        return result;
    }
    if (value is IVertexSet<double> doubles && type.GetProperty("Edges") is PropertyInfo dep) return new { vertices = doubles.Vertices, edges = ((IEnumerable)dep.GetValue(value)!).Cast<object>().Select(Snapshot), directed = type.GetProperty("IsDirected")!.GetValue(value), parallel = type.GetProperty("AllowParallelEdges")!.GetValue(value) };
    if (value is IVertexSet<string> strings && type.GetProperty("Edges") is PropertyInfo esp) return new { vertices = strings.Vertices, edges = ((IEnumerable)esp.GetValue(value)!).Cast<object>().Select(Snapshot), directed = type.GetProperty("IsDirected")!.GetValue(value), parallel = type.GetProperty("AllowParallelEdges")!.GetValue(value) };
    if (type.GetProperty("Source") is PropertyInfo source && type.GetProperty("Target") is PropertyInfo target)
    {
        var result = new Dictionary<string, object?> { ["source"] = Snapshot(source.GetValue(value)), ["target"] = Snapshot(target.GetValue(value)) };
        if (value is EquatableTestEdge customEdgeValue) { result["id"] = customEdgeValue.ID; result["text"] = customEdgeValue.String; result["number"] = customEdgeValue.Int; result["integer64"] = customEdgeValue.Long.ToString(); result["boolean"] = customEdgeValue.Bool; result["single"] = customEdgeValue.Float; result["number64"] = customEdgeValue.Double; }
        foreach (var key in new[] { "Tag", "SourceTerminal", "TargetTerminal" }) if (type.GetProperty(key) is PropertyInfo p) result[char.ToLowerInvariant(key[0]) + key[1..]] = p.GetValue(value);
        return result;
    }
    if (value is GraphvizColor c) return new { a = c.A, r = c.R, g = c.G, b = c.B };
    if (value is GraphvizSize s) return new { width = s.Width, height = s.Height };
    if (value is GraphvizSizeF f) return new { width = f.Width, height = f.Height };
    if (value is Exception e) return new { type = type.Name, message = e.Message, inner = Snapshot(e.InnerException) };
    if (value is ForestDisjointSet<int> set) return new { representatives = new[] { 0, 1, 2, 3 }.Select(set.FindSet).ToArray(), count = set.SetCount };
    if (value is object[] o && o.Length > 0 && ReferenceEquals(o[0], o)) return new { self = ReferenceEquals(o[0], o), shared = ReferenceEquals(o[1], o[2]), graph = Snapshot(o[1]) };
    if (value is IDictionary d) { var entries = new List<object>(); foreach (DictionaryEntry entry in d) entries.Add(new { key = Snapshot(entry.Key), value = Snapshot(entry.Value) }); return entries; }
    if (value is Array shaped && (shaped.Rank > 1 || shaped.GetLowerBound(0) != 0)) return new { lengths = Enumerable.Range(0, shaped.Rank).Select(shaped.GetLength).ToArray(), lowerBounds = Enumerable.Range(0, shaped.Rank).Select(shaped.GetLowerBound).ToArray(), values = shaped.Cast<object?>().Select(Snapshot).ToArray() };
    if (value is IEnumerable items && value is not string) return items.Cast<object?>().Select(Snapshot).ToArray();
    if (value is DateTime dt) return new { dateTimeTicks = dt.Ticks.ToString(), kind = dt.Kind.ToString() };
    if (value is TimeSpan ts) return new { timeSpanTicks = ts.Ticks.ToString() };
    if (value is decimal dec) return new { decimalValue = dec.ToString(System.Globalization.CultureInfo.InvariantCulture) };
    if (value is float fv && !float.IsFinite(fv)) return fv.ToString(System.Globalization.CultureInfo.InvariantCulture);
    if (value is double dv && !double.IsFinite(dv)) return dv.ToString(System.Globalization.CultureInfo.InvariantCulture);
    if (value is long or ulong) return value.ToString();
    return value;
}

sealed class FixtureBinder : SerializationBinder
{
    private readonly Dictionary<string, Type> allowed = new();
    private static string Normalize(string name) => Regex.Replace(name.Replace("System.Private.CoreLib", "mscorlib"), @", Version=[^,\]]+, Culture=[^,\]]+, PublicKeyToken=[^,\]]+", "");
    public override void BindToName(Type serializedType, out string? assemblyName, out string? typeName)
    {
        assemblyName = null; typeName = null;
        allowed[Normalize(serializedType.FullName!)] = serializedType;
    }
    public override Type BindToType(string assemblyName, string typeName) => allowed.TryGetValue(Normalize(typeName), out var t) ? t : throw new SerializationException("Type was not emitted by this fixture generator: " + typeName);
}

sealed class SchemaCollector
{
    private readonly HashSet<object> visited = new(ReferenceEqualityComparer.Instance);
    public readonly Dictionary<string, object> Schemas = new();
    public void Visit(object? value)
    {
        if (value is null || !visited.Add(value)) return;
        var type = value.GetType();
        if (type.IsPrimitive || type.IsEnum || value is string or DateTime or TimeSpan or decimal) return;
        if (value is Array array) { foreach (var item in array) Visit(item); return; }
        var entries = new List<(string Name, Type Type, object? Value)>();
        if (value is ISerializable serializable)
        {
            var info = new SerializationInfo(type, new FormatterConverter()); serializable.GetObjectData(info, new StreamingContext(StreamingContextStates.All));
            foreach (SerializationEntry member in info) entries.Add((member.Name, member.ObjectType, member.Value));
        }
        else
        {
            var fields = FormatterServices.GetSerializableMembers(type);
            var values = FormatterServices.GetObjectData(value, fields);
            for (var i = 0; i < fields.Length; i++) entries.Add((fields[i].Name, ((FieldInfo)fields[i]).FieldType, values[i]));
        }
        Schemas.TryAdd(type.FullName!, new { assembly = type.Assembly.FullName, customSerialization = value is ISerializable, members = entries.Select(e => new { name = e.Name, type = e.Type.FullName, runtimeType = e.Value?.GetType().FullName }).ToArray() });
        foreach (var entry in entries) Visit(entry.Value);
    }
}
