// upstream: tests/QuikGraph.Petri.Tests/IdentityExpressionTests.cs::Evaluate
// upstream: tests/QuikGraph.Petri.Tests/IdentityExpressionTests.cs::Evaluate_Throws
// upstream: tests/QuikGraph.Petri.Tests/AlwaysTrueConditionExpressionTests.cs::IsEnabled
// upstream: tests/QuikGraph.Petri.Tests/Structures/PlaceTests.cs::Constructor
// upstream: tests/QuikGraph.Petri.Tests/Structures/PlaceTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Petri.Tests/Structures/PlaceTests.cs::ToStringWithMarking
// upstream: tests/QuikGraph.Petri.Tests/Structures/PlaceTests.cs::ObjectToString
// upstream: tests/QuikGraph.Petri.Tests/Structures/TransitionTests.cs::Constructor
// upstream: tests/QuikGraph.Petri.Tests/Structures/TransitionTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Petri.Tests/Structures/TransitionTests.cs::Condition
// upstream: tests/QuikGraph.Petri.Tests/Structures/TransitionTests.cs::ObjectToString
// upstream: tests/QuikGraph.Petri.Tests/Structures/ArcTests.cs::Constructor
// upstream: tests/QuikGraph.Petri.Tests/Structures/ArcTests.cs::ObjectToString
// upstream: tests/QuikGraph.Petri.Tests/Structures/PetriNetTests.cs::MutableNetContent
// upstream: tests/QuikGraph.Petri.Tests/Structures/PetriNetTests.cs::Clone
// upstream: tests/QuikGraph.Petri.Tests/PetriNetSimulatorTests.cs::Constructor
// upstream: tests/QuikGraph.Petri.Tests/PetriNetSimulatorTests.cs::Constructor_Throws
// upstream: tests/QuikGraph.Petri.Tests/PetriNetSimulatorTests.cs::Simulate
import test from 'node:test';
import assert from 'node:assert/strict';
import { PetriNet,PetriNetSimulator,Place,Transition,Arc,IdentityExpression,AlwaysTrueConditionExpression } from '../src/petri.js';
// Source: QuikGraph.Petri.Tests/IdentityExpressionTests.cs and AlwaysTrueConditionExpressionTests.cs
for(const tokens of [[],[1],[1,2],['A']])test(`IdentityExpressionTests.Evaluate ${JSON.stringify(tokens)}`,()=>{assert.equal(new IdentityExpression().Evaluate(tokens),tokens);assert.equal(new AlwaysTrueConditionExpression().IsEnabled(tokens),true);});
test('IdentityExpressionTests.Evaluate_Throws',()=>assert.throws(()=>new IdentityExpression().Evaluate(null)));
// Source: Structures/{Place,Transition,Arc,PetriNet}Tests.cs
for(const Type of [Place,Transition])test(`${Type.name}Tests.Constructor_Throws`,()=>assert.throws(()=>new Type(null)));
test('PlaceTests.ToString / ToStringWithMarking',()=>{const p=new Place('input');assert.equal(p.ToString(),'P(input|0)');p.Marking.Add(1);assert.equal(p.ToString(),'P(input|1)');assert.equal(p.ToStringWithMarking(),'P(input|1)\n\tNumber');});
test('TransitionTests.Condition / ToString',()=>{const t=new Transition('fire');assert.equal(t.ToString(),'T(fire)');assert.throws(()=>{t.Condition=null;});assert.equal(t.Condition.IsEnabled([]),true);});
test('ArcTests.Constructor / Annotation / ToString',()=>{const p=new Place('p'),t=new Transition('t'),input=new Arc(p,t),output=new Arc(t,p);assert.equal(input.Source,p);assert.equal(output.Source,p);assert.equal(output.Target,t);assert.equal(input.IsInputArc,true);assert.equal(output.IsInputArc,false);assert.equal(input.ToString(),'P(p|0) -> T(t)');assert.equal(output.ToString(),'T(t) -> P(p|0)');assert.throws(()=>{input.Annotation=null;});});
test('PetriNetTests.Add / Clone',()=>{const net=new PetriNet(),p=net.AddPlace('p'),q=net.AddPlace('q'),t=net.AddTransition('t');net.AddArc(p,t);net.AddArc(t,q);const clone=net.Clone();assert.notEqual(clone.Graph,net.Graph);assert.deepEqual([...clone.Places],[p,q]);assert.equal(clone.Graph.VertexCount,3);assert.equal(clone.Graph.EdgeCount,2);p.Marking.Add(1);assert.equal([...clone.Places][0].Marking.Count,1);});
// Source: PetriNetSimulatorTests.Simulate, barber shop, all seven marking states.
test('PetriNetSimulatorTests.Simulate',()=>{
 class Customer{constructor(name){this.Name=name;}}class Barber{constructor(name){this.Name=name;}}
 const n=new PetriNet(),entrance=n.AddPlace('entrance'),waiting=n.AddPlace('waiting'),cutting=n.AddPlace('cutting'),idle=n.AddPlace('idle'),paying=n.AddPlace('paying'),notPaying=n.AddPlace('not paying'),out=n.AddPlace('out');
 const enter=n.AddTransition('enter'),start=n.AddTransition('start'),finish=n.AddTransition('finish'),exit=n.AddTransition('exit');
 const both=tokens=>tokens.some(p=>p instanceof Customer)&&tokens.some(p=>p instanceof Barber);start.Condition=both;finish.Condition=both;exit.Condition=tokens=>tokens.some(p=>p instanceof Customer);
 n.AddArc(entrance,enter);n.AddArc(enter,waiting);n.AddArc(waiting,start).Annotation=tokens=>[tokens.find(p=>p instanceof Customer),tokens.find(p=>p instanceof Barber)].filter(Boolean);n.AddArc(start,cutting);n.AddArc(cutting,finish);n.AddArc(finish,idle).Annotation=tokens=>tokens.filter(p=>p instanceof Barber).slice(0,1);n.AddArc(idle,start);n.AddArc(finish,paying).Annotation=tokens=>tokens.filter(p=>p instanceof Customer).slice(0,1);n.AddArc(finish,notPaying).Annotation=()=>[];n.AddArc(paying,exit);n.AddArc(notPaying,exit);n.AddArc(exit,out);
 const jean=new Customer('Jean'),daniel=new Customer('Daniel'),joe=new Barber('Joe');entrance.Marking.AddRange([jean,daniel]);idle.Marking.Add(joe);const sim=new PetriNetSimulator(n);sim.Initialize();
 const states=[[[jean,daniel],[],[],[joe],[],[]],[[],[jean,daniel],[],[joe],[],[]],[[],[daniel],[jean,joe],[],[],[]],[[],[daniel],[],[joe],[jean],[]],[[],[],[daniel,joe],[],[],[jean]],[[],[],[],[joe],[daniel],[jean]],[[],[],[],[joe],[],[jean,daniel]],[[],[],[],[joe],[],[jean,daniel]]];
 for(let step=0;step<states.length;step++){if(step)sim.SimulateStep();[entrance,waiting,cutting,idle,paying,out].forEach((p,i)=>assert.deepEqual([...p.Marking].sort((a,b)=>a.Name.localeCompare(b.Name)),[...states[step][i]].sort((a,b)=>a.Name.localeCompare(b.Name)),`step ${step}, place ${p.Name}`));assert.deepEqual([...notPaying.Marking],[]);}
});
test('PetriNetSimulatorTests.Constructor_Throws / Initialize',()=>{assert.throws(()=>new PetriNetSimulator(null));const n=new PetriNet();n.AddTransition('t');assert.throws(()=>new PetriNetSimulator(n).SimulateStep(),/Initialize/);});
test('Petri shared-token multiset behavior retains upstream phase semantics',()=>{const n=new PetriNet(),input=n.AddPlace('i'),output=n.AddPlace('o'),t=n.AddTransition('t');n.AddArc(input,t);n.AddArc(t,output);input.Marking.AddRange([1,1,2]);const s=new PetriNetSimulator(n);s.Initialize();s.SimulateStep();assert.deepEqual([...input.Marking],[]);assert.deepEqual([...output.Marking],[1,1,2]);});

test('Petri input consumption respects token equality and large identity markings',()=>{const n=new PetriNet(),p=n.AddPlace('i'),q=n.AddPlace('o'),t=n.AddTransition('t');n.AddArc(p,t);n.AddArc(t,q);for(let i=0;i<200000;i++)p.Marking.Add(i);const sim=new PetriNetSimulator(n);sim.Initialize();sim.SimulateStep();assert.equal(p.Marking.Count,0);assert.equal(q.Marking.Count,200000);assert.equal(q.Marking[199999],199999);q.Marking.Clear();const token={Id:1,Equals(other){return this.Id===other.Id;}};q.Marking.Add(token);assert.equal(q.Marking.Remove({Id:1}),true);});
