import { EqualityMap as Map, EqualitySet as Set } from './equality.js';
/** Graphviz DOT bridge. Rendering engines are supplied through IDotEngine-compatible adapters. */
import { EventHook } from './core.js';
const required = (value, name = 'value') => { if (value == null) throw new TypeError(`${name} cannot be null`); return value; };
const nonempty = (value, name = 'value') => { required(value, name); if (String(value).length === 0) throw new TypeError(`${name} cannot be empty`); return value; };
const equal = (a,b) => a?.Equals ? a.Equals(b) : a === b;
export const GraphvizArrowClipping = Object.freeze({"None": "none", "Left": "left", "Right": "right"});
export const GraphvizArrowFilling = Object.freeze({"Close": "close", "Open": "open"});
export const GraphvizArrowShape = Object.freeze({"Box": "box", "Crow": "crow", "Diamond": "diamond", "Dot": "dot", "Inv": "inv", "None": "none", "Normal": "normal", "Tee": "tee", "Vee": "vee", "Curve": "curve", "ICurve": "icurve"});
export const GraphvizClusterMode = Object.freeze({"Local": "local", "Global": "global", "None": "none"});
export const GraphvizEdgeDirection = Object.freeze({"None": "none", "Forward": "forward", "Back": "back", "Both": "both"});
export const GraphvizEdgeStyle = Object.freeze({"Unspecified": "unspecified", "Invis": "invis", "Dashed": "dashed", "Dotted": "dotted", "Bold": "bold", "Solid": "solid"});
export const GraphvizImageType = Object.freeze({"Cmap": "cmap", "Fig": "fig", "Gd": "gd", "Gd2": "gd2", "Gif": "gif", "Hpgl": "hpgl", "Imap": "imap", "Jpeg": "jpeg", "Mif": "mif", "Mp": "mp", "Pcl": "pcl", "Pic": "pic", "PlainText": "plaintext", "Png": "png", "Ps": "ps", "Ps2": "ps2", "Svg": "svg", "Svgz": "svgz", "Vrml": "vrml", "Vtx": "vtx", "Wbmp": "wbmp"});
export const GraphvizLabelJustification = Object.freeze({"L": "l", "R": "r", "C": "c"});
export const GraphvizLabelLocation = Object.freeze({"T": "t", "B": "b"});
export const GraphvizOutputMode = Object.freeze({"BreadthFirst": "breadthfirst", "NodesFirst": "nodesfirst", "EdgesFirst": "edgesfirst"});
export const GraphvizPageDirection = Object.freeze({"BL": "BL", "BR": "BR", "TL": "TL", "TR": "TR", "RB": "RB", "RT": "RT", "LB": "LB", "LT": "LT"});
export const GraphvizRankDirection = Object.freeze({"LR": "LR", "TB": "TB"});
export const GraphvizRatioMode = Object.freeze({"Fill": "fill", "Compress": "compress", "Auto": "auto"});
export const GraphvizSplineType = Object.freeze({"Spline": "spline", "None": "none", "Line": "line", "Polyline": "polyline", "Curved": "curved", "Ortho": "ortho"});
export const GraphvizVertexShape = Object.freeze({"Unspecified": "unspecified", "Box": "box", "Polygon": "polygon", "Ellipse": "ellipse", "Circle": "circle", "Point": "point", "Egg": "egg", "Triangle": "triangle", "Plaintext": "plaintext", "Diamond": "diamond", "Trapezium": "trapezium", "Parallelogram": "parallelogram", "House": "house", "Pentagon": "pentagon", "Hexagon": "hexagon", "Septagon": "septagon", "Octagon": "octagon", "DoubleCircle": "doublecircle", "DoubleOctagon": "doubleoctagon", "TripleOctagon": "tripleoctagon", "InvTriangle": "invtriangle", "InvTrapezium": "invtrapezium", "InvHouse": "invhouse", "MDiamond": "mdiamond", "MSquare": "msquare", "MCircle": "mcircle", "Rect": "rect", "Rectangle": "rectangle", "Record": "record"});
export const GraphvizVertexStyle = Object.freeze({"Unspecified": "unspecified", "Filled": "filled", "Diagonals": "diagonals", "Rounded": "rounded", "Invis": "invis", "Dashed": "dashed", "Dotted": "dotted", "Bold": "bold", "Solid": "solid"});

export const DotEscapers = Object.freeze({
  Escape(value) { return String(required(value)).replace(/\r\n|\r|\n|["\\]/g, s => /[\r\n]/.test(s) ? '\\n' : '\\' + s); },
  EscapeRecord(value) { return String(required(value)).replace(/\r\n|\r|\n|[|<>" \\{}]/g, s => /[\r\n]/.test(s) ? '\\n' : '\\' + s); },
  EscapePort(value) { return String(required(value)).replace(/\r\n|\r|\n|[|<>" \\{}]/g, '_'); }
});
export class HtmlString { constructor(value) { this.String = required(value); } toString() { return this.String; } }
class RawDot { constructor(value) { this.value = value; } }
const raw = value => new RawDot(value);
const quote = value => `"${DotEscapers.Escape(value)}"`;
const dotValue = value => value instanceof RawDot ? String(value.value) : value instanceof HtmlString ? `<${value.String}>` : value instanceof GraphvizRecord ? `"${value.ToDot()}"` : value instanceof GraphvizColor ? quote(value.ToDot()) : typeof value === 'string' ? quote(value) : String(value).toLowerCase();
const put = (map,key,value) => map instanceof globalThis.Map ? map.set(key,value) : (required(map)[key] = value);
const dotParameters = (map, separator = ', ') => [...(map instanceof globalThis.Map ? map : Object.entries(map))].map(([key,value]) => `${key}=${dotValue(value)}`).join(separator);
export class GraphvizColor {
  constructor(a=0,r=0,g=0,b=0) { for (const c of [a,r,g,b]) if (!Number.isInteger(c) || c<0 || c>255) throw new RangeError('Color channels must be bytes'); this.A=a;this.R=r;this.G=g;this.B=b; Object.freeze(this); }
  Equals(other) { return other instanceof GraphvizColor && this.A===other.A && this.R===other.R && this.G===other.G && this.B===other.B; }
  GetHashCode() { return (this.A<<24)|(this.R<<16)|(this.G<<8)|this.B; }
  ToDot() { return '#' + [this.R,this.G,this.B,this.A].map(c=>c.toString(16).padStart(2,'0').toUpperCase()).join(''); }
  toString() { return this.ToDot(); }
}

GraphvizColor.AliceBlue = new GraphvizColor(0xFF, 0xF0, 0xF8, 0xFF);
GraphvizColor.AntiqueWhite = new GraphvizColor(0xFF, 0xFA, 0xEB, 0xD7);
GraphvizColor.Aqua = new GraphvizColor(0xFF, 0x00, 0xFF, 0xFF);
GraphvizColor.Aquamarine = new GraphvizColor(0xFF, 0x7F, 0xFF, 0xD4);
GraphvizColor.Azure = new GraphvizColor(0xFF, 0xF0, 0xFF, 0xFF);
GraphvizColor.Beige = new GraphvizColor(0xFF, 0xF5, 0xF5, 0xDC);
GraphvizColor.Bisque = new GraphvizColor(0xFF, 0xFF, 0xE4, 0xC4);
GraphvizColor.Black = new GraphvizColor(0xFF, 0, 0, 0);
GraphvizColor.BlanchedAlmond = new GraphvizColor(0xFF, 0xFF, 0xEB, 0xCD);
GraphvizColor.Blue = new GraphvizColor(0xFF, 0, 0, 0xFF);
GraphvizColor.BlueViolet = new GraphvizColor(0xFF, 0x8A, 0x2B, 0xE2);
GraphvizColor.Brown = new GraphvizColor(0xFF, 0xA5, 0x2A, 0x2A);
GraphvizColor.BurlyWood = new GraphvizColor(0xFF, 0xDE, 0xB8, 0x87);
GraphvizColor.CadetBlue = new GraphvizColor(0xFF, 0x5F, 0x9E, 0xA0);
GraphvizColor.Chartreuse = new GraphvizColor(0xFF, 0x7F, 0xFF, 0);
GraphvizColor.Chocolate = new GraphvizColor(0xFF, 0xD2, 0x69, 0x1E);
GraphvizColor.Coral = new GraphvizColor(0xFF, 0xFF, 0x7F, 0x50);
GraphvizColor.CornflowerBlue = new GraphvizColor(0xFF, 0x64, 0x95, 0xED);
GraphvizColor.Cornsilk = new GraphvizColor(0xFF, 0xFF, 0xF8, 0xDC);
GraphvizColor.Crimson = new GraphvizColor(0xFF, 0xDC, 0x14, 0x3C);
GraphvizColor.Cyan = new GraphvizColor(0xFF, 0, 0xFF, 0xFF);
GraphvizColor.DarkBlue = new GraphvizColor(0xFF, 0, 0, 0x8B);
GraphvizColor.DarkCyan = new GraphvizColor(0xFF, 0, 0x8B, 0x8B);
GraphvizColor.DarkGoldenrod = new GraphvizColor(0xFF, 0xB8, 0x86, 0x0B);
GraphvizColor.DarkGray = new GraphvizColor(0xFF, 0xA9, 0xA9, 0xA9);
GraphvizColor.DarkGreen = new GraphvizColor(0xFF, 0, 0x64, 0);
GraphvizColor.DarkKhaki = new GraphvizColor(0xFF, 0xBD, 0xB7, 0x6B);
GraphvizColor.DarkMagenta = new GraphvizColor(0xFF, 0x8B, 0, 0x8B);
GraphvizColor.DarkOliveGreen = new GraphvizColor(0xFF, 0x55, 0x6B, 0x2F);
GraphvizColor.DarkOrange = new GraphvizColor(0xFF, 0xFF, 0x8C, 0);
GraphvizColor.DarkOrchid = new GraphvizColor(0xFF, 0x99, 0x32, 0xCC);
GraphvizColor.DarkRed = new GraphvizColor(0xFF, 0x8B, 0, 0);
GraphvizColor.DarkSalmon = new GraphvizColor(0xFF, 0xE9, 0x96, 0x7A);
GraphvizColor.DarkSeaGreen = new GraphvizColor(0xFF, 0x8F, 0xBC, 0x8B);
GraphvizColor.DarkSlateBlue = new GraphvizColor(0xFF, 0x48, 0x3D, 0x8B);
GraphvizColor.DarkSlateGray = new GraphvizColor(0xFF, 0x2F, 0x4F, 0x4F);
GraphvizColor.DarkTurquoise = new GraphvizColor(0xFF, 0, 0xCE, 0xD1);
GraphvizColor.DarkViolet = new GraphvizColor(0xFF, 0x94, 0, 0xD3);
GraphvizColor.DeepPink = new GraphvizColor(0xFF, 0xFF, 0x14, 0x93);
GraphvizColor.DeepSkyBlue = new GraphvizColor(0xFF, 0, 0xBF, 0xFF);
GraphvizColor.DimGray = new GraphvizColor(0xFF, 0x69, 0x69, 0x69);
GraphvizColor.DodgerBlue = new GraphvizColor(0xFF, 0x1E, 0x90, 0xFF);
GraphvizColor.Firebrick = new GraphvizColor(0xFF, 0xB2, 0x22, 0x22);
GraphvizColor.FloralWhite = new GraphvizColor(0xFF, 0xFF, 0xFA, 0xF0);
GraphvizColor.ForestGreen = new GraphvizColor(0xFF, 0x22, 0x8B, 0x22);
GraphvizColor.Fuchsia = new GraphvizColor(0xFF, 0xFF, 0, 0xFF);
GraphvizColor.Gainsboro = new GraphvizColor(0xFF, 0xDC, 0xDC, 0xDC);
GraphvizColor.GhostWhite = new GraphvizColor(0xFF, 0xF8, 0xF8, 0xFF);
GraphvizColor.Gold = new GraphvizColor(0xFF, 0xFF, 0xD7, 0);
GraphvizColor.Goldenrod = new GraphvizColor(0xFF, 0xDA, 0xA5, 0x20);
GraphvizColor.Gray = new GraphvizColor(0xFF, 0x80, 0x80, 0x80);
GraphvizColor.Green = new GraphvizColor(0xFF, 0, 0x80, 0);
GraphvizColor.GreenYellow = new GraphvizColor(0xFF, 0xAD, 0xFF, 0x2F);
GraphvizColor.Honeydew = new GraphvizColor(0xFF, 0xF0, 0xFF, 0xF0);
GraphvizColor.HotPink = new GraphvizColor(0xFF, 0xFF, 0x69, 0xB4);
GraphvizColor.IndianRed = new GraphvizColor(0xFF, 0xCD, 0x5C, 0x5C);
GraphvizColor.Indigo = new GraphvizColor(0xFF, 0x4B, 0, 0x82);
GraphvizColor.Ivory = new GraphvizColor(0xFF, 0xFF, 0xFF, 0xF0);
GraphvizColor.Khaki = new GraphvizColor(0xFF, 0xF0, 0xE6, 0x8C);
GraphvizColor.Lavender = new GraphvizColor(0xFF, 0xE6, 0xE6, 0xFA);
GraphvizColor.LavenderBlush = new GraphvizColor(0xFF, 0xFF, 0xF0, 0xF5);
GraphvizColor.LawnGreen = new GraphvizColor(0xFF, 0x7C, 0xFC, 0);
GraphvizColor.LemonChiffon = new GraphvizColor(0xFF, 0xFF, 0xFA, 0xCD);
GraphvizColor.LightBlue = new GraphvizColor(0xFF, 0xAD, 0xD8, 0xE6);
GraphvizColor.LightCoral = new GraphvizColor(0xFF, 0xF0, 0x80, 0x80);
GraphvizColor.LightCyan = new GraphvizColor(0xFF, 0xE0, 0xFF, 0xFF);
GraphvizColor.LightGoldenrodYellow = new GraphvizColor(0xFF, 0xFA, 0xFA, 0xD2);
GraphvizColor.LightGray = new GraphvizColor(0xFF, 0xD3, 0xD3, 0xD3);
GraphvizColor.LightGreen = new GraphvizColor(0xFF, 0x90, 0xEE, 0x90);
GraphvizColor.LightPink = new GraphvizColor(0xFF, 0xFF, 0xB6, 0xC1);
GraphvizColor.LightSalmon = new GraphvizColor(0xFF, 0xFF, 0xA0, 0x7A);
GraphvizColor.LightSeaGreen = new GraphvizColor(0xFF, 0x20, 0xB2, 0xAA);
GraphvizColor.LightSkyBlue = new GraphvizColor(0xFF, 0x87, 0xCE, 0xFA);
GraphvizColor.LightSlateGray = new GraphvizColor(0xFF, 0x77, 0x88, 0x99);
GraphvizColor.LightSteelBlue = new GraphvizColor(0xFF, 0xB0, 0xC4, 0xDE);
GraphvizColor.LightYellow = new GraphvizColor(0xFF, 0xFF, 0xFF, 0xE0);
GraphvizColor.Lime = new GraphvizColor(0xFF, 0, 0xFF, 0);
GraphvizColor.LimeGreen = new GraphvizColor(0xFF, 0x32, 0xCD, 0x32);
GraphvizColor.Linen = new GraphvizColor(0xFF, 0xFA, 0xF0, 0xE6);
GraphvizColor.Magenta = new GraphvizColor(0xFF, 0xFF, 0x00, 0xFF);
GraphvizColor.Maroon = new GraphvizColor(0xFF, 0x80, 0, 0);
GraphvizColor.MediumAquamarine = new GraphvizColor(0xFF, 0x66, 0xCD, 0xAA);
GraphvizColor.MediumBlue = new GraphvizColor(0xFF, 0, 0, 0xCD);
GraphvizColor.MediumOrchid = new GraphvizColor(0xFF, 0xBA, 0x55, 0xD3);
GraphvizColor.MediumPurple = new GraphvizColor(0xFF, 0x93, 0x70, 0xDB);
GraphvizColor.MediumSeaGreen = new GraphvizColor(0xFF, 0x3C, 0xB3, 0x71);
GraphvizColor.MediumSlateBlue = new GraphvizColor(0xFF, 0x7B, 0x68, 0xEE);
GraphvizColor.MediumSpringGreen = new GraphvizColor(0xFF, 0, 0xFA, 0x9A);
GraphvizColor.MediumTurquoise = new GraphvizColor(0xFF, 0x48, 0xD1, 0xCC);
GraphvizColor.MediumVioletRed = new GraphvizColor(0xFF, 0xC7, 0x15, 0x85);
GraphvizColor.MidnightBlue = new GraphvizColor(0xFF, 0x19, 0x19, 0x70);
GraphvizColor.MintCream = new GraphvizColor(0xFF, 0xF5, 0xFF, 0xFA);
GraphvizColor.MistyRose = new GraphvizColor(0xFF, 0xFF, 0xE4, 0xE1);
GraphvizColor.Moccasin = new GraphvizColor(0xFF, 0xFF, 0xE4, 0xE1);
GraphvizColor.NavajoWhite = new GraphvizColor(0xFF, 0xFF, 0xDE, 0xAD);
GraphvizColor.Navy = new GraphvizColor(0xFF, 0, 0, 0x80);
GraphvizColor.OldLace = new GraphvizColor(0xFF, 0xFD, 0xF5, 0xE6);
GraphvizColor.Olive = new GraphvizColor(0xFF, 0x80, 0x80, 0);
GraphvizColor.OliveDrab = new GraphvizColor(0xFF, 0x6B, 0x8E, 0x23);
GraphvizColor.Orange = new GraphvizColor(0xFF, 0xFF, 0xA5, 0);
GraphvizColor.OrangeRed = new GraphvizColor(0xFF, 0xFF, 0x45, 0);
GraphvizColor.Orchid = new GraphvizColor(0xFF, 0xDA, 0x70, 0xD6);
GraphvizColor.PaleGoldenrod = new GraphvizColor(0xFF, 0xEE, 0xE8, 0xAA);
GraphvizColor.PaleGreen = new GraphvizColor(0xFF, 0x98, 0xFB, 0x98);
GraphvizColor.PaleTurquoise = new GraphvizColor(0xFF, 0xAF, 0xEE, 0xEE);
GraphvizColor.PaleVioletRed = new GraphvizColor(0xFF, 0xDB, 0x70, 0x93);
GraphvizColor.PapayaWhip = new GraphvizColor(0xFF, 0xFF, 0xEF, 0xD5);
GraphvizColor.PeachPuff = new GraphvizColor(0xFF, 0xFF, 0xDA, 0xB9);
GraphvizColor.Peru = new GraphvizColor(0xFF, 0xCD, 0x85, 0x3F);
GraphvizColor.Pink = new GraphvizColor(0xFF, 0xFF, 0xC0, 0xCB);
GraphvizColor.Plum = new GraphvizColor(0xFF, 0xDD, 0xA0, 0xDD);
GraphvizColor.PowderBlue = new GraphvizColor(0xFF, 0xB0, 0xE0, 0xE6);
GraphvizColor.Purple = new GraphvizColor(0xFF, 0x80, 0, 0x80);
GraphvizColor.Red = new GraphvizColor(0xFF, 0xFF, 0, 0);
GraphvizColor.RosyBrown = new GraphvizColor(0xFF, 0xBC, 0x8F, 0x8F);
GraphvizColor.RoyalBlue = new GraphvizColor(0xFF, 0x41, 0x69, 0xE1);
GraphvizColor.SaddleBrown = new GraphvizColor(0xFF, 0x8B, 0x45, 0x13);
GraphvizColor.Salmon = new GraphvizColor(0xFF, 0xFA, 0x80, 0x72);
GraphvizColor.SandyBrown = new GraphvizColor(0xFF, 0xF4, 0xA4, 0x60);
GraphvizColor.SeaGreen = new GraphvizColor(0xFF, 0x2E, 0x8B, 0x57);
GraphvizColor.SeaShell = new GraphvizColor(0xFF, 0xFF, 0xF5, 0xEE);
GraphvizColor.Sienna = new GraphvizColor(0xFF, 0xA0, 0x52, 0x2D);
GraphvizColor.Silver = new GraphvizColor(0xFF, 0xC0, 0xC0, 0xC0);
GraphvizColor.SkyBlue = new GraphvizColor(0xFF, 0x87, 0xCE, 0xEB);
GraphvizColor.SlateBlue = new GraphvizColor(0xFF, 0x6A, 0x5A, 0xCD);
GraphvizColor.SlateGray = new GraphvizColor(0xFF, 0x70, 0x80, 0x90);
GraphvizColor.Snow = new GraphvizColor(0xFF, 0xFF, 0xFA, 0xFA);
GraphvizColor.SpringGreen = new GraphvizColor(0xFF, 0, 0xFF, 0x7F);
GraphvizColor.SteelBlue = new GraphvizColor(0xFF, 0x46, 0x82, 0xB4);
GraphvizColor.Tan = new GraphvizColor(0xFF, 0xD2, 0xB4, 0x8C);
GraphvizColor.Teal = new GraphvizColor(0xFF, 0, 0x80, 0x80);
GraphvizColor.Thistle = new GraphvizColor(0xFF, 0xD8, 0xBF, 0xD8);
GraphvizColor.Tomato = new GraphvizColor(0xFF, 0xFF, 0x63, 0x47);
GraphvizColor.Transparent = new GraphvizColor(0, 0xFF, 0xFF, 0xFF);
GraphvizColor.Turquoise = new GraphvizColor(0xFF, 0x40, 0xE0, 0xD0);
GraphvizColor.Violet = new GraphvizColor(0xFF, 0xEE, 0x82, 0xEE);
GraphvizColor.Wheat = new GraphvizColor(0xFF, 0xF5, 0xDE, 0xB3);
GraphvizColor.White = new GraphvizColor(0xFF, 0xFF, 0xFF, 0xFF);
GraphvizColor.WhiteSmoke = new GraphvizColor(0xFF, 0xF5, 0xF5, 0xF5);
GraphvizColor.Yellow = new GraphvizColor(0xFF, 0xFF, 0xFF, 0);
GraphvizColor.YellowGreen = new GraphvizColor(0xFF, 0x9A, 0xCD, 0x32);
export class GraphvizFont { constructor(name,sizeInPoints) { this.Name = nonempty(name,'name'); if (!(sizeInPoints>0)) throw new RangeError('Size must be positive'); this.SizeInPoints = sizeInPoints; } }
export class GraphvizPoint { constructor(x,y) { this.X=x; this.Y=y; } }
export class GraphvizSizeF {
  constructor(width=0,height=0) { if (!(width>=0 && height>=0)) throw new RangeError('Width and height must be nonnegative'); this.Width=width; this.Height=height; }
  get IsEmpty() { return this.Width===0 || this.Height===0; } ToString() { return `${this.Width}x${this.Height}`; } toString() { return this.ToString(); }
}
export class GraphvizSize extends GraphvizSizeF {}
class DotCollection extends Array {
  static get [Symbol.species]() { return Array; }
  constructor(collection=[]) { super(); this.push(...required(collection)); }
  get Count() { return this.length; } Add(item) { this.push(required(item)); } AddRange(items) { for (const item of items) this.Add(item); }
  Clear() { this.length=0; } Contains(item) { return this.includes(item); } Remove(item) { const i=this.indexOf(item); if (i<0) return false; this.splice(i,1); return true; }
  Insert(index,item) { this.splice(index,0,required(item)); } RemoveAt(index) { if(index<0||index>=this.length) throw new RangeError('Index out of range'); this.splice(index,1); }
}
export class GraphvizLayer { constructor(name) { this.Name=name; } get Name() { return this._name; } set Name(value) { this._name=nonempty(value,'Name'); } }
export class GraphvizLayerCollection extends DotCollection {
  constructor(collection=[]) { super(collection); this.Separators=':'; }
  get Separators() { return this._separators; } set Separators(value) { this._separators=nonempty(value,'Separators'); }
  ToDot() { return this.length ? `layers=${quote(this.map(v=>v.Name).join(this.Separators))}; layersep=${quote(this.Separators)}` : ''; }
}
export class GraphvizRecordCellCollection extends DotCollection {}
export class GraphvizRecord {
  constructor() { this.Cells=new GraphvizRecordCellCollection(); }
  get Cells() { return this._cells; } set Cells(value) { this._cells=required(value,'Cells'); }
  ToDot() { return Array.from(this.Cells,c=>c.ToDot()).join(' | '); } ToString() { return this.ToDot(); } toString() { return this.ToDot(); }
}
export class GraphvizRecordCell extends GraphvizRecord {
  constructor(text=null,port=null) { super(); this.Text=text; this.Port=port; }
  get HasPort() { return this.Port!=null&&String(this.Port).length>0; } get HasText() { return this.Text!=null&&String(this.Text).length>0; }
  ToDot() { let s=(this.HasPort ? `<${DotEscapers.EscapePort(this.Port)}> ` : '')+(this.HasText?DotEscapers.EscapeRecord(this.Text):''); if(this.Cells.length) s+=(s?' | ':'')+`{ ${super.ToDot()} }`; return s; }
}
export class GraphvizArrow {
  constructor(shape,clipping=GraphvizArrowClipping.None,filling=GraphvizArrowFilling.Close) { this.Shape=shape; this.Clipping=clipping; this.Filling=filling; }
  ToDot() { const shape=String(this.Shape).toLowerCase(); return (this.Filling===GraphvizArrowFilling.Open && ['box','diamond','dot','inv','normal'].includes(shape)?'o':'')+(['box','crow','diamond','inv','normal','tee','vee','curve','icurve'].includes(shape)?this.Clipping===GraphvizArrowClipping.Left?'l':this.Clipping===GraphvizArrowClipping.Right?'r':'':'')+shape; }
  ToString() { return this.ToDot(); } toString() { return this.ToDot(); }
}
class DotFormat { GenerateDot(properties) { return dotParameters(required(properties)); } ToString() { return this.ToDot(); } toString() { return this.ToDot(); } }
export class GraphvizVertex extends DotFormat {
  constructor() { super(); /** @type {GraphvizPoint | null} */ this.Position=null;/** @type {string | null} */ this.Comment=null;this.IsHtmlLabel=false;/** @type {string | null} */ this.Label=null;/** @type {string | null} */ this.ToolTip=null;/** @type {string | null} */ this.Url=null;this.Distortion=0;this.FillColor=GraphvizColor.White;/** @type {GraphvizFont | null} */ this.Font=null;this.FontColor=GraphvizColor.Black;this.PenWidth=1;/** @type {string | null} */ this.Group=null;/** @type {GraphvizLayer | null} */ this.Layer=null;this.Orientation=0;this.Peripheries=-1;this.Regular=false;this.Record=new GraphvizRecord();this.Shape=GraphvizVertexShape.Unspecified;this.Sides=4;this.Size=new GraphvizSizeF();this.FixedSize=false;this.Skew=0;this.StrokeColor=GraphvizColor.Black;this.Style=GraphvizVertexStyle.Unspecified;this.Z=-1; }
  InternalToDot(commonFormat=null) {
    const p=new Map(); if(this.Font) { p.set('fontname',this.Font.Name); p.set('fontsize',this.Font.SizeInPoints); }
    if(!equal(this.FontColor,GraphvizColor.Black)) p.set('fontcolor',this.FontColor);
    if(this.PenWidth!==1) p.set('penwidth',this.PenWidth);
    for(const [prop,key] of [['ToolTip','tooltip'],['Comment','comment'],['Url','URL']]) if(this[prop]!=null) p.set(key,this[prop]);
    if(this.Shape!==GraphvizVertexShape.Unspecified) p.set('shape',raw(this.Shape));
    const shape=this.Shape===GraphvizVertexShape.Unspecified&&commonFormat?commonFormat.Shape:this.Shape;
    if(shape===GraphvizVertexShape.Record) { if(this.Label) p.set('label',raw(`"${this.Label}"`)); else if(this.Record?.Cells.length) p.set('label',this.Record); }
    else if(this.Label) p.set('label',this.IsHtmlLabel?new HtmlString(this.Label):this.Label);
    if(shape===GraphvizVertexShape.Polygon) for(const [prop,key] of [['Sides','sides'],['Skew','skew'],['Distortion','distortion']]) if(this[prop]!==0) p.set(key,this[prop]);
    if(this.FixedSize) { p.set('fixedsize',true); if(this.Size.Height>0)p.set('height',this.Size.Height); if(this.Size.Width>0)p.set('width',this.Size.Width); }
    if(this.Style!==GraphvizVertexStyle.Unspecified) p.set('style',raw(this.Style));
    if(!equal(this.StrokeColor,GraphvizColor.Black))p.set('color',this.StrokeColor);
    if(!equal(this.FillColor,GraphvizColor.White))p.set('fillcolor',this.FillColor);
    if(this.Orientation>0)p.set('orientation',this.Orientation); if(this.Regular)p.set('regular',true);
    if(this.Group!=null)p.set('group',this.Group); if(this.Layer)p.set('layer',this.Layer.Name);
    if(this.Peripheries>=0)p.set('peripheries',this.Peripheries); if(this.Z>0)p.set('z',this.Z);
    if(this.Position)p.set('pos',`${this.Position.X},${this.Position.Y}!`);
    return this.GenerateDot(p);
  }
  ToDot() { return this.InternalToDot(); }
}
export class GraphvizEdgeLabel {
  constructor() { this.Angle=-25;this.Distance=1;this.Float=true;/** @type {GraphvizFont | null} */ this.Font=null;this.FontColor=GraphvizColor.Black;this.IsHtmlLabel=false;/** @type {string | null} */ this.Value=null; }
  AddParameters(parameters,escape=true) { required(parameters); if(this.Value==null)return; put(parameters,'label',this.IsHtmlLabel?new HtmlString(this.Value):escape?DotEscapers.Escape(this.Value):this.Value); if(this.Angle!==-25)put(parameters,'labelangle',this.Angle); if(this.Distance!==1)put(parameters,'labeldistance',this.Distance); if(!this.Float)put(parameters,'labelfloat',false); if(this.Font) { put(parameters,'labelfontname',this.Font.Name); put(parameters,'labelfontsize',this.Font.SizeInPoints); } if(!equal(this.FontColor,GraphvizColor.Black))put(parameters,'labelfontcolor',this.FontColor); }
}
export class GraphvizEdgeExtremity {
  constructor(isHead) { this.IsHead=!!isHead;this.IsClipped=true;this.IsHtmlLabel=false;/** @type {string | null} */ this.Label=null;/** @type {string | null} */ this.ToolTip=null;/** @type {string | null} */ this.Url=null;/** @type {string | null} */ this.Logical=null;/** @type {string | null} */ this.Same=null; }
  AddParameters(parameters,escape=true) { required(parameters); const e=this.IsHead?'head':'tail'; if(this.Url!=null)put(parameters,e+'URL',this.Url); if(!this.IsClipped)put(parameters,e+'clip',false); if(this.Label!=null)put(parameters,e+'label',this.IsHtmlLabel?new HtmlString(this.Label):escape?DotEscapers.Escape(this.Label):this.Label); if(this.ToolTip!=null)put(parameters,e+'tooltip',escape?DotEscapers.Escape(this.ToolTip):this.ToolTip); if(this.Logical!=null)put(parameters,'l'+e,this.Logical); if(this.Same!=null)put(parameters,'same'+e,this.Same); }
}
export class GraphvizEdge extends DotFormat {
  constructor() { super(); /** @type {string | null} */ this.Comment=null;this.Label=new GraphvizEdgeLabel();/** @type {string | null} */ this.ToolTip=null;/** @type {string | null} */ this.Url=null;this.Direction=GraphvizEdgeDirection.Forward;/** @type {GraphvizFont | null} */ this.Font=null;this.FontColor=GraphvizColor.Black;this.PenWidth=1;this.Head=new GraphvizEdgeExtremity(true);/** @type {GraphvizArrow | null} */ this.HeadArrow=null;/** @type {string | null} */ this.HeadPort=null;this.Tail=new GraphvizEdgeExtremity(false);/** @type {GraphvizArrow | null} */ this.TailArrow=null;/** @type {string | null} */ this.TailPort=null;this.IsConstrained=true;this.IsDecorated=false;/** @type {GraphvizLayer | null} */ this.Layer=null;this.StrokeColor=GraphvizColor.Black;this.Style=GraphvizEdgeStyle.Unspecified;this.Weight=1;this.Length=1;this.MinLength=1; }
  get Label(){return this._label;} set Label(v){this._label=required(v,'Label');}
  get Head(){return this._head;} set Head(v){if(!required(v,'Head').IsHead)throw new TypeError('Head must be a head extremity');this._head=v;}
  get Tail(){return this._tail;} set Tail(v){if(required(v,'Tail').IsHead)throw new TypeError('Tail must be a tail extremity');this._tail=v;}
  ToDot() {
    const p=new Map(); if(this.Direction!==GraphvizEdgeDirection.Forward)p.set('dir',raw(this.Direction));
    if(this.Font){p.set('fontname',this.Font.Name);p.set('fontsize',this.Font.SizeInPoints);} if(!equal(this.FontColor,GraphvizColor.Black))p.set('fontcolor',this.FontColor); if(this.PenWidth!==1)p.set('penwidth',this.PenWidth);
    this.Head.AddParameters(p,false); if(this.HeadArrow)p.set('arrowhead',this.HeadArrow.ToDot());if(this.HeadPort!=null)p.set('headport',DotEscapers.EscapePort(this.HeadPort));
    if(!this.IsConstrained)p.set('constraint',false);if(this.IsDecorated)p.set('decorate',true);this.Label.AddParameters(p,false);if(this.Layer)p.set('layer',this.Layer.Name);
    if(this.MinLength!==1)p.set('minlen',this.MinLength);if(this.Length!==1)p.set('len',this.Length);if(!equal(this.StrokeColor,GraphvizColor.Black))p.set('color',this.StrokeColor);if(this.Style!==GraphvizEdgeStyle.Unspecified)p.set('style',raw(this.Style));
    this.Tail.AddParameters(p,false);if(this.TailArrow)p.set('arrowtail',this.TailArrow.ToDot());if(this.TailPort!=null)p.set('tailport',DotEscapers.EscapePort(this.TailPort));
    for(const [prop,key] of [['ToolTip','tooltip'],['Comment','comment'],['Url','URL']])if(this[prop]!=null)p.set(key,this[prop]);if(this.Weight!==1)p.set('weight',this.Weight);
    return this.GenerateDot(p);
  }
}
export class GraphvizGraph extends DotFormat {
  constructor() { super(); this.Name='G';/** @type {string | null} */ this.Comment=null;/** @type {string | null} */ this.Url=null;this.BackgroundColor=GraphvizColor.White;this.ClusterRank=GraphvizClusterMode.Local;/** @type {GraphvizFont | null} */ this.Font=null;this.FontColor=GraphvizColor.Black;this.PenWidth=1;this.IsCentered=false;this.IsCompounded=false;this.IsConcentrated=false;this.IsLandscape=false;this.IsNormalized=false;this.IsReMinCross=false;this.IsHtmlLabel=false;/** @type {string | null} */ this.Label=null;this.LabelJustification=GraphvizLabelJustification.C;this.LabelLocation=GraphvizLabelLocation.B;this.Layers=new GraphvizLayerCollection();this.McLimit=1;this.NodeSeparation=0.25;this.RankDirection=GraphvizRankDirection.TB;this.RankSeparation=0.5;this.NsLimit=-1;this.NsLimit1=-1;this.OutputOrder=GraphvizOutputMode.BreadthFirst;this.PageDirection=GraphvizPageDirection.BL;this.PageSize=new GraphvizSizeF();this.Quantum=0;this.Ratio=GraphvizRatioMode.Auto;this.Resolution=0.96;this.Rotate=0;this.SamplePoints=8;this.SearchSize=30;this.Size=new GraphvizSizeF();this.Splines=GraphvizSplineType.Spline;/** @type {string | null} */ this.StyleSheet=null; }
  get Name(){return this._name;}set Name(v){this._name=required(v,'Name');}
  GenerateDot(p) { const parts=[...(p instanceof globalThis.Map?p:Object.entries(p))].map(([key,value])=>value instanceof GraphvizLayerCollection?value.ToDot():`${key}=${dotValue(value)}`); return parts.join('; ')+(parts.length>1?';':''); }
  ToDot() {
    const p=new Map();if(this.Url!=null)p.set('URL',this.Url);if(!equal(this.BackgroundColor,GraphvizColor.White))p.set('bgcolor',this.BackgroundColor);if(this.IsCentered)p.set('center',true);if(this.ClusterRank!==GraphvizClusterMode.Local)p.set('clusterrank',this.ClusterRank);if(this.Comment!=null)p.set('comment',this.Comment);if(this.IsCompounded)p.set('compound',true);if(this.IsConcentrated)p.set('concentrate',true);
    if(this.Font){p.set('fontname',this.Font.Name);p.set('fontsize',this.Font.SizeInPoints);}if(!equal(this.FontColor,GraphvizColor.Black))p.set('fontcolor',this.FontColor);if(this.PenWidth!==1)p.set('penwidth',this.PenWidth);if(this.Label!=null)p.set('label',this.IsHtmlLabel?new HtmlString(this.Label):this.Label);
    if(this.LabelJustification!==GraphvizLabelJustification.C)p.set('labeljust',this.LabelJustification);if(this.LabelLocation!==GraphvizLabelLocation.B)p.set('labelloc',this.LabelLocation);if(this.Layers.length)p.set('layers',this.Layers);
    for(const [prop,key,def] of [['McLimit','mclimit',1],['NodeSeparation','nodesep',0.25]])if(this[prop]!==def)p.set(key,this[prop]);
    if(this.RankDirection!==GraphvizRankDirection.TB)p.set('rankdir',raw(this.RankDirection));if(this.RankSeparation!==0.5)p.set('ranksep',this.RankSeparation);if(this.IsNormalized)p.set('normalize',true);if(this.NsLimit>0)p.set('nslimit',this.NsLimit);if(this.NsLimit1>0)p.set('nslimit1',this.NsLimit1);if(this.OutputOrder!==GraphvizOutputMode.BreadthFirst)p.set('outputorder',this.OutputOrder);
    if(!this.PageSize.IsEmpty)p.set('page',`${this.PageSize.Width},${this.PageSize.Height}`);if(this.PageDirection!==GraphvizPageDirection.BL)p.set('pagedir',raw(this.PageDirection));if(this.Quantum>0)p.set('quantum',this.Quantum);if(this.Ratio!==GraphvizRatioMode.Auto)p.set('ratio',this.Ratio);if(this.IsReMinCross)p.set('remincross',true);if(this.Resolution!==0.96)p.set('resolution',this.Resolution);if(this.Rotate)p.set('rotate',this.Rotate);else if(this.IsLandscape)p.set('orientation','[1L]*');
    if(this.SamplePoints!==8)p.set('samplepoints',this.SamplePoints);if(this.SearchSize!==30)p.set('searchsize',this.SearchSize);if(!this.Size.IsEmpty)p.set('size',`${this.Size.Width},${this.Size.Height}`);if(this.Splines!==GraphvizSplineType.Spline)p.set('splines',raw(this.Splines));if(this.StyleSheet!=null)p.set('stylesheet',this.StyleSheet);return this.GenerateDot(p);
  }
}
export class FormatVertexEventArgs { constructor(vertex,vertexFormat){this.Vertex=required(vertex,'vertex');this.VertexFormat=required(vertexFormat,'vertexFormat');} }
export class FormatEdgeEventArgs { constructor(edge,edgeFormat){this.Edge=required(edge,'edge');this.EdgeFormat=required(edgeFormat,'edgeFormat');} }
export class FormatClusterEventArgs { constructor(cluster,graphFormat){this.Cluster=required(cluster,'cluster');this.GraphFormat=required(graphFormat,'graphFormat');} }
export class GraphvizAlgorithm {
  constructor(graph,imageType=GraphvizImageType.Png){this.VisitedGraph=graph;this.ImageType=imageType;this.GraphFormat=new GraphvizGraph();this.CommonVertexFormat=new GraphvizVertex();this.CommonEdgeFormat=new GraphvizEdge();this.FormatVertex=new EventHook();this.FormatEdge=new EventHook();this.FormatCluster=new EventHook();/** @type {string | null} */ this.Output=null;this.ClusterCount=0;}
  get VisitedGraph(){return this._graph;}set VisitedGraph(v){this._graph=required(v,'graph');}
  Generate(engine,outputFilePath){
    if(arguments.length&&engine==null)throw new TypeError('engine cannot be null');if(engine)nonempty(outputFilePath,'outputFilePath');
    this.ClusterCount=0;const ids=new Map(Array.from(this.VisitedGraph.Vertices,(v,i)=>[v,i]));const remainingVertices=new Set(ids.keys());const remainingEdges=new Set(this.VisitedGraph.Edges);const name=String(this.GraphFormat.Name);const lines=[`${this.VisitedGraph.IsDirected?'digraph':'graph'} ${/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(name)?name:quote(name)} {`];
    const gf=this.GraphFormat.ToDot(),vf=this.CommonVertexFormat.ToDot(),ef=this.CommonEdgeFormat.ToDot();if(gf)lines.push(gf);if(vf)lines.push(`node [${vf}];`);if(ef)lines.push(`edge [${ef}];`);
    const vertex=v=>{const f=new GraphvizVertex();this.FormatVertex.emit(this,new FormatVertexEventArgs(v,f));const dot=f.InternalToDot(this.CommonVertexFormat);lines.push(`${ids.get(v)}${dot?` [${dot}]`:''};`);remainingVertices.delete(v);};
    const edge=e=>{if(!ids.has(e.Source)||!ids.has(e.Target))throw new Error('Edge references vertex outside graph');const f=new GraphvizEdge();this.FormatEdge.emit(this,new FormatEdgeEventArgs(e,f));const dot=f.ToDot();lines.push(`${ids.get(e.Source)} ${this.VisitedGraph.IsDirected?'->':'--'} ${ids.get(e.Target)}${dot?` [${dot}]`:''};`);remainingEdges.delete(e);};
    const clusters=parent=>{for(const cluster of parent.Clusters??[]){lines.push(`subgraph cluster${++this.ClusterCount} {`);const f=new GraphvizGraph();this.FormatCluster.emit(this,new FormatClusterEventArgs(cluster,f));const dot=f.ToDot();if(dot)lines.push(dot);clusters(cluster);if(parent.Collapsed){for(const v of cluster.Vertices)remainingVertices.delete(v);for(const e of cluster.Edges)remainingEdges.delete(e);}else{for(const v of cluster.Vertices)if(remainingVertices.has(v))vertex(v);for(const e of cluster.Edges)if(remainingEdges.has(e))edge(e);}lines.push('}');}};
    clusters(this.VisitedGraph);for(const v of remainingVertices)vertex(v);for(const e of remainingEdges)edge(e);lines.push('}');this.Output=lines.join('\n');return engine?engine.Run(this.ImageType,this.Output,outputFilePath):this.Output;
  }
}
export function ToGraphviz(graph,configure){if(arguments.length>1&&configure===null)throw new TypeError('initAlgorithm cannot be null');const algorithm=new GraphvizAlgorithm(graph);if(configure)configure(algorithm);return algorithm.Generate();}
/** Historical upstream endpoint is no longer operational. ToSvg requires an actual rendering engine. */
export const DotToSvgApiEndpoint='https://rise4fun.com/rest/ask/Agl/';
export function ToSvg(graphOrDot,engine,configure){required(graphOrDot,'graphOrDot');required(engine,'SVG rendering engine');const dot=typeof graphOrDot==='string'?graphOrDot:ToGraphviz(graphOrDot,configure);let result;if(typeof engine==='function')result=engine(dot);else if(typeof engine.renderString==='function')result=engine.renderString(dot,{format:'svg'});else if(typeof engine.Run==='function')result=engine.Run(GraphvizImageType.Svg,dot,'graph.svg');else throw new TypeError('SVG engine must expose renderString, Run or be a callback');return result?.then?result.then(value=>value??''):result??'';}
export const GraphvizExtensions=Object.freeze({ToGraphviz,ToSvg,DotToSvgApiEndpoint});
/** Portable file writer: pass (path, text) => result. A Promise result is supported. */
export class FileDotEngine {
  constructor(writeFile){this.WriteFile=required(writeFile,'writeFile callback');}
  Run(imageType,dot,path){nonempty(dot,'dot');nonempty(path,'outputFilePath');const output=/\.dot$/i.test(path)?path:path+'.dot';const value=this.WriteFile(output,dot);return value?.then?value.then(()=>output):output;}
}
export const SvgHtmlWrapper=Object.freeze({
  ParseSize(svg){required(svg,'svg');const tag=String(svg).match(/<svg\b[^>]*>/i)?.[0]??'';const width=tag.match(/\bwidth\s*=\s*["'](\d+(?:\.\d+)?)\s*(?:px)?["']/i);const height=tag.match(/\bheight\s*=\s*["'](\d+(?:\.\d+)?)\s*(?:px)?["']/i);return width&&height?new GraphvizSize(+width[1],+height[1]):new GraphvizSize(400,400);},
  DumpHtml(size,svgPath,writeFile){required(size);required(svgPath);const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));const html=`<!doctype html>\n<html><body><object data="${esc(svgPath)}" type="image/svg+xml" width="${size.Width}" height="${size.Height}"></object></body></html>`;if(!writeFile)return html;const path=svgPath+'.html';const result=writeFile(path,html);return result?.then?result.then(()=>path):path;},
  WrapSvg(svg,svgPath='image.svg',writeFile){return this.DumpHtml(this.ParseSize(svg),svgPath,writeFile);}
});
export class GraphRendererBase {
  constructor(graph){this.Graphviz=new GraphvizAlgorithm(graph);Object.assign(this.Graphviz.CommonVertexFormat,{Style:GraphvizVertexStyle.Filled,FillColor:GraphvizColor.LightYellow,Font:new GraphvizFont('Tahoma',8.25),Shape:GraphvizVertexShape.Box});this.Graphviz.CommonEdgeFormat.Font=new GraphvizFont('Tahoma',8.25);}
  get VisitedGraph(){return this.Graphviz.VisitedGraph;}Initialize(){}Clean(){}
  Generate(...args){this.Initialize();try{return this.Graphviz.Generate(...args);}finally{this.Clean();}}
}
export class CondensatedGraphRenderer extends GraphRendererBase {
  Initialize(){this._vertexFormatter=(_,args)=>{const g=args.Vertex;args.VertexFormat.Label=`${g.VertexCount}-${g.EdgeCount}\n`+Array.from(g.Vertices,v=>`  ${v}\n`).join('')+Array.from(g.Edges,e=>`  ${e}\n`).join('');};this._edgeFormatter=(_,args)=>{const edges=[...args.Edge.Edges];args.EdgeFormat.Label.Value=`${edges.length}\n`+edges.map(e=>`  ${e}\n`).join('');};this.Graphviz.FormatVertex.add(this._vertexFormatter);this.Graphviz.FormatEdge.add(this._edgeFormatter);}
  Clean(){this.Graphviz.FormatVertex.remove(this._vertexFormatter);this.Graphviz.FormatEdge.remove(this._edgeFormatter);}
}
export class EdgeMergeCondensatedGraphRenderer extends CondensatedGraphRenderer {
  Initialize(){super.Initialize();this.Graphviz.FormatVertex.remove(this._vertexFormatter);this._vertexFormatter=(_,args)=>{args.VertexFormat.Label=String(args.Vertex);};this.Graphviz.FormatVertex.add(this._vertexFormatter);}
}
export const BasicStructuresExtensions=Object.freeze({ToGraphvizColor:color=>color instanceof GraphvizColor?color:new GraphvizColor(color.A??255,color.R,color.G,color.B),ToFont:(font,fontFactory)=>font==null?null:fontFactory?fontFactory(font.Name,font.SizeInPoints):{Name:font.Name,SizeInPoints:font.SizeInPoints},ToGraphvizFont:font=>font==null?null:new GraphvizFont(font.Name,font.SizeInPoints),ToGraphvizPoint:point=>new GraphvizPoint(point.X,point.Y),ToGraphvizSize:size=>new GraphvizSize(size.Width,size.Height),ToGraphvizSizeF:size=>new GraphvizSizeF(size.Width,size.Height)});
