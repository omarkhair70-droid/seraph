import bpy,json
bpy.ops.wm.open_mainfile(filepath=r'C:\Users\dell\Downloads\SERARA.blend')
print('ASSET_INSPECTION',json.dumps([{'name':o.name,'type':o.type,'verts':len(o.data.vertices) if o.type=='MESH' else 0,'bones':len(o.data.bones) if o.type=='ARMATURE' else 0,'dimensions':list(o.dimensions)} for o in bpy.data.objects]))
