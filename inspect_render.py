import bpy, math
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=r'C:\Users\dell\Downloads\SERARA.blend')
s=bpy.context.scene
s.render.engine='BLENDER_WORKBENCH'
s.render.resolution_x=1000;s.render.resolution_y=1100;s.render.resolution_percentage=100
s.world.color=(.1,.1,.1)
s.display.shading.light='STUDIO';s.display.shading.color_type='MATERIAL';s.display.shading.show_shadows=True;s.display.shading.show_cavity=True
s.display.shading.background_type='WORLD'
bpy.ops.object.camera_add(location=(3,-7,3))
c=bpy.context.object;c.rotation_euler=(Vector((0,0,1.15))-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=2.8;s.camera=c
s.render.filepath=r'C:\Users\dell\Documents\Codex\2026-09-22\you-are-now-responsible-for-producing\work\existing.png'
bpy.ops.render.render(write_still=True)
print('BONES',[(b.name,list(b.head_local),list(b.tail_local)) for o in bpy.data.objects if o.type=='ARMATURE' for b in o.data.bones])
