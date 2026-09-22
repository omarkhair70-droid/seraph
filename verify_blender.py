import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'outputs'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'SERARA_CANONICAL.glb'))
scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE');meshes=[o for o in scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
report={'reimported':True,'armatures':len([o for o in scene.objects if o.type=='ARMATURE']),'bone_count':len(rig.data.bones),'mesh_count':len(meshes),'unweighted':0,'weight_sum_errors':0,'over_four_weights':0,'nonfinite':0,'tests':[]}
for o in meshes:
 for v in o.data.vertices:
  w=[g.weight for g in v.groups if g.weight>1e-7]
  report['unweighted']+=int(not w);report['weight_sum_errors']+=int(abs(sum(w)-1)>1e-4);report['over_four_weights']+=int(len(w)>4)
  report['nonfinite']+=int(not all(math.isfinite(x) for x in v.co))
scene.render.engine='BLENDER_WORKBENCH';scene.render.resolution_x=1000;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('ReviewWorld');scene.world.color=(.065,.065,.065)
sh=scene.display.shading;sh.light='STUDIO';sh.color_type='MATERIAL';sh.show_shadows=True;sh.show_cavity=True;sh.cavity_type='BOTH';sh.background_type='WORLD'
bpy.ops.object.camera_add(location=(3,-7,3));cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=2.65
def frame(loc,target,scale):
 cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
def render(name):
 scene.render.filepath=str(ROOT/'work'/name);bpy.ops.render.render(write_still=True)
def reset():
 for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0);b.scale=(1,1,1)
 bpy.context.view_layer.update()
def pose(bone,xyz):rig.pose.bones[bone].rotation_euler=tuple(math.radians(v) for v in xyz)
def evaluate(name):
 bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();bad=0;big=0;max_stretch=0;stretch_over4=0;edges=0;lo=Vector((1e6,1e6,1e6));hi=-lo;worst=[]
 for o in meshes:
  e=o.evaluated_get(deps);me=e.to_mesh()
  for v in me.vertices:
   co=e.matrix_world@v.co;bad+=int(not all(math.isfinite(x) for x in co))
   for i in range(3):lo[i]=min(lo[i],co[i]);hi[i]=max(hi[i],co[i])
  for edge in o.data.edges:
   a,b=edge.vertices;orig=(o.data.vertices[a].co-o.data.vertices[b].co).length
   if orig>.0002:
    ratio=(me.vertices[a].co-me.vertices[b].co).length/orig;max_stretch=max(max_stretch,ratio);stretch_over4+=int(ratio>4);edges+=1
    if ratio>4:worst.append({'object':o.name,'ratio':ratio,'length':orig,'co':list(o.data.vertices[a].co),'weights_a':{o.vertex_groups[g.group].name:g.weight for g in o.data.vertices[a].groups},'weights_b':{o.vertex_groups[g.group].name:g.weight for g in o.data.vertices[b].groups}})
  e.to_mesh_clear()
 report['tests'].append({'name':name,'nonfinite':bad,'bounds_min':list(lo),'bounds_max':list(hi),'max_edge_stretch':max_stretch,'edges_stretched_over_4x':stretch_over4,'tested_edges':edges,'worst_edges':sorted(worst,key=lambda d:-d['ratio'])[:8]})
 return lo,hi
reset();evaluate('neutral reimport')
frame((3,-8,3.3),(0,0,1.2),2.65);render('reimport_three_quarter.png')
frame((0,7,1.25),(0,0,1.25),2.58);render('review_back.png')
frame((7,0,1.25),(0,0,1.25),2.58);render('review_side.png')
pose('Neck',(20,0,0));pose('Head',(0,35,0));pose('LeftArm',(0,0,-65));pose('RightArm',(0,0,65));pose('LeftForeArm',(60,0,0));pose('RightForeArm',(60,0,0));evaluate('neck shoulders elbows')
frame((3,-7,3.1),(0,0,1.3),2.7);render('pose_shoulders.png')
reset();pose('Spine',(-20,0,0));pose('Spine1',(-15,0,0));pose('Neck',(-16,0,0))
for side in ['Left','Right']:
 pose(side+'UpLeg',(-90,0,0));pose(side+'Leg',(120,0,0));pose(side+'Foot',(-30,0,0));pose(side+'ForeArm',(70,0,0))
lo,hi=evaluate('compressed FALL joint stress, geometry state neutral')
target=(lo+hi)/2;frame((3,-6,2.5),target,2.0);render('pose_compressed.png')
frame((6,0,1.4),target,1.9);render('pose_compressed_side.png')
reset()
for side in ['Left','Right']:
 for finger in ['Thumb','Index','Middle','Ring','Little']:
  for j in [1,2,3]:pose(side+'Hand'+finger+str(j),(32 if j==1 else 55,0,0))
evaluate('all ten finger chains curl')
frame((1.5,3,1.35),(.59,0,1.05),.45);render('pose_hand.png')
reset();frame((1.5,3,1.35),(.59,0,1.05),.45);render('review_hand.png')
report['data_integrity_pass']=not any(report[k] for k in ['unweighted','weight_sum_errors','over_four_weights','nonfinite']) and all(t['nonfinite']==0 for t in report['tests'])
report['deformation_numeric_pass']=all(t['edges_stretched_over_4x']==0 for t in report['tests'])
report['pass']=report['data_integrity_pass'] and report['deformation_numeric_pass']
(OUT/'BLENDER_REIMPORT_VERIFICATION.json').write_text(json.dumps(report,indent=2))
print('REIMPORT_REPORT',json.dumps(report),flush=True)
