import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'outputs'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'SERARA_CANONICAL.blend'))
for name in ['SERARA_Body','SERARA_Head']:
 o=bpy.data.objects[name];adj=[[] for v in o.data.vertices]
 for e in o.data.edges:
  a,b=e.vertices;adj[a].append(b);adj[b].append(a)
 unseen=set(range(len(adj)));remove=set()
 while unseen:
  start=unseen.pop();stack=[start];comp={start}
  while stack:
   a=stack.pop()
   for b in adj[a]:
    if b in unseen:unseen.remove(b);stack.append(b);comp.add(b)
  if len(comp)<=3:remove|=comp
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='DESELECT');bpy.ops.object.mode_set(mode='OBJECT')
 for v in o.data.vertices:v.select=v.index in remove
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.delete(type='VERT');bpy.ops.object.mode_set(mode='OBJECT')
 print('Removed isolated remesh fragments',name,len(remove),flush=True)
rig=bpy.data.objects['SERARA_Rig'];meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'SERARA_CANONICAL.blend'))
for o in meshes:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'SERARA_CANONICAL.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_morph=True,export_yup=True,export_apply=False,export_extras=True)
stats={'mesh_count':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'bones':len(rig.data.bones),'height_m':max(v.co.z for o in meshes for v in o.data.vertices)-min(v.co.z for o in meshes for v in o.data.vertices),'objects':[{'name':o.name,'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons)} for o in meshes]}
(OUT/'BUILD_STATS.json').write_text(json.dumps(stats,indent=2))
