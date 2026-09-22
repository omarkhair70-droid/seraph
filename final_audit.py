import bpy,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'outputs'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'SERARA_CANONICAL.blend'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
report={'objects':[],'source_pose_neutral':True,'external_textures':[]}
for o in meshes:
 adj=[[] for _ in o.data.vertices]
 for e in o.data.edges:
  a,b=e.vertices;adj[a].append(b);adj[b].append(a)
 unseen=set(range(len(adj)));sizes=[]
 while unseen:
  stack=[unseen.pop()];n=0
  while stack:
   a=stack.pop();n+=1
   for b in adj[a]:
    if b in unseen:unseen.remove(b);stack.append(b)
  sizes.append(n)
 report['objects'].append({'name':o.name,'components':len(sizes),'largest_components':sorted(sizes,reverse=True)[:10],'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'morphs':[] if not o.data.shape_keys else [{'name':k.name,'value':k.value,'moved_vertices':sum((a.co-b.co).length>1e-7 for a,b in zip(k.data,o.data.shape_keys.key_blocks[0].data))} for k in o.data.shape_keys.key_blocks[1:]]})
for o in bpy.context.scene.objects:
 if o.type=='ARMATURE':
  report['source_pose_neutral']=all(max(abs(x) for x in b.matrix_basis.to_euler())<1e-6 and b.location.length<1e-6 for b in o.pose.bones)
  report['bone_hierarchy']={b.name:b.parent.name if b.parent else None for b in o.data.bones}
(OUT/'SOURCE_AUDIT.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
