import bpy, math, json, os, sys
import numpy as np
from mathutils import Vector, kdtree
from mathutils.bvhtree import BVHTree
from math import sin, cos, pi, exp, sqrt
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs'; OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for d in list(bpy.data.materials): bpy.data.materials.remove(d)
scene=bpy.context.scene
scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1

def mat(name,color,metal=0,rough=.55,emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if emission:
        p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    return m
ivory=mat('SERARA_Porcelain',(.69,.625,.51),.04,.52)
inner=mat('SERARA_InnerMineral',(.095,.063,.043),.1,.67)
rim=mat('SERARA_CavityRim',(.31,.235,.145),.12,.57)
eye=mat('SERARA_EyeObsidian',(.032,.019,.01),.3,.23)
signal=mat('SERARA_InternalSignal',(.78,.245,.035),.05,.3,1.8)
all_mesh=[]; source_samples=[]

def normalize(w):
    w={k:v for k,v in w.items() if v>1e-6};w=dict(sorted(w.items(),key=lambda kv:-kv[1])[:4]);s=sum(w.values())
    return {k:v/s for k,v in w.items()}
def smooth(t):
    t=max(0,min(1,t));return t*t*(3-2*t)
def mix(a,b,t):
    t=smooth(t);return normalize({k:a.get(k,0)*(1-t)+b.get(k,0)*t for k in set(a)|set(b)})
def wz(z):
    nodes=[(1.13,'Hips'),(1.30,'Spine'),(1.49,'Spine1'),(1.70,'Spine2'),(1.89,'Neck'),(2.04,'Head')]
    if z<=nodes[0][0]: return {'Hips':1}
    for (a,n),(b,m) in zip(nodes,nodes[1:]):
        if z<=b:return mix({n:1},{m:1},(z-a)/(b-a))
    return {'Head':1}
def mesh(name,vs,fs,material=ivory,weights=None,source=False):
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update()
    o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);me.materials.append(material)
    for p in me.polygons:p.use_smooth=True
    if weights:
        groups={k:o.vertex_groups.new(name=k) for w in weights for k in w if k not in locals().get('groups',{})} if False else {}
        for i,w in enumerate(weights):
            for k,v in normalize(w).items():
                if k not in groups:groups[k]=o.vertex_groups.new(name=k)
                groups[k].add([i],v,'REPLACE')
            if source:source_samples.append((Vector(vs[i]),w.copy()))
    all_mesh.append(o);return o
def active(o):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
def apply(o,mod):
    active(o);bpy.ops.object.modifier_apply(modifier=mod.name)
def interp(values,t):
    # Smooth Catmull-Rom interpolation through authored section profiles.
    n=len(values);u=max(0,min(n-1-1e-8,t*(n-1)));i=int(u);f=u-i
    a=np.array(values[max(0,i-1)]);b=np.array(values[i]);c=np.array(values[min(n-1,i+1)]);d=np.array(values[min(n-1,i+2)])
    return .5*((2*b)+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f)
def loft(name,sections,weight_fn,around=24,steps=40,material=ivory,source=True,axis='Z',sculpt=None):
    # Each section is x,y,z, width, depth. Basis follows the centerline.
    vs=[];ws=[];fs=[];prev_u=Vector((1,0,0))
    for j in range(steps+1):
        t=j/steps;p=interp(sections,t);c=Vector(p[:3])
        p0=interp(sections,max(0,t-.001));p1=interp(sections,min(1,t+.001));tangent=Vector(p1[:3])-Vector(p0[:3]);tangent.normalize()
        u=(prev_u-tangent*prev_u.dot(tangent)).normalized()
        if u.length<.1:u=Vector((0,0,1)).cross(tangent).normalized()
        prev_u=u.copy();v=tangent.cross(u).normalized()
        for i in range(around):
            a=i*2*pi/around;vtx=c+u*(p[3]*cos(a))+v*(p[4]*sin(a))
            if sculpt:vtx=sculpt(vtx,t,a)
            vs.append(tuple(vtx));ws.append(weight_fn(vtx,t))
        if j:
            for i in range(around):
                a0=(j-1)*around+i;b0=(j-1)*around+(i+1)%around;c0=j*around+(i+1)%around;d0=j*around+i
                fs.append((a0,b0,c0,d0))
    fs.append(tuple(range(around-1,-1,-1)));fs.append(tuple(steps*around+i for i in range(around)))
    return mesh(name,vs,fs,material,ws,source)
def tube(name,points,radii,weight_fn,material=ivory,around=10,steps=30,source=False):
    return loft(name,[(*p,r,r) for p,r in zip(points,radii)],weight_fn,around,steps,material,source)
def ellipsoid(name,loc,scale,material,weight_fn,segments=32,rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale;active(o);bpy.ops.object.transform_apply(location=True,rotation=False,scale=True)
    o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    groups={}
    for v in o.data.vertices:
        for k,w in weight_fn(v.co,0).items():
            if k not in groups:groups[k]=o.vertex_groups.new(name=k)
            groups[k].add([v.index],w,'REPLACE')
    all_mesh.append(o);return o

print('BUILD: body profiles',flush=True)
bodyparts=[]
torso=[(0,0,1.04,.035,.037),(0,.007,1.14,.115,.085),(0,.016,1.24,.15,.09),(0,.02,1.34,.103,.069),(0,.015,1.44,.085,.062),(0,.007,1.55,.125,.080),(0,.003,1.66,.163,.1),(0,.008,1.74,.182,.077),(0,.012,1.79,.133,.06),(0,.015,1.85,.057,.041),(0,.022,1.95,.037,.036),(0,.022,2.065,.046,.039)]
def torso_sculpt(v,t,a):
    front=max(0,-sin(a))
    # Subtle grown pectoral volumes integrated into the ribcage.
    v.y-=.031*exp(-((v.z-1.67)/.060)**2)*exp(-((abs(v.x)-.080)/.055)**2)*front**4
    v.y+=.006*exp(-(v.x/.018)**2)*exp(-((v.z-1.50)/.19)**2)*front
    return v
bodyparts.append(loft('Body_seed',torso,lambda v,t:wz(v.z),48,100,sculpt=torso_sculpt))

bone_specs=[('Root',(0,0,0),(0,0,.12),None),('Hips',(0,0,1.12),(0,0,1.26),'Root'),('Spine',(0,0,1.26),(0,0,1.43),'Hips'),('Spine1',(0,0,1.43),(0,0,1.59),'Spine'),('Spine2',(0,0,1.59),(0,.012,1.80),'Spine1'),('Neck',(0,.012,1.80),(0,.02,2.04),'Spine2'),('Head',(0,.02,2.04),(0,.025,2.32),'Neck')]
hand_data={};leg_data={};arm_data={}
def chainweight(q,points,names,band=.16):
    # Smooth adjacent-bone blend around each joint in chain-distance units.
    pts=[Vector(p) for p in points];ds=[(pts[i+1]-pts[i]).length for i in range(len(pts)-1)];cum=[0]
    for d in ds:cum.append(cum[-1]+d)
    best=(1e9,0)
    for i in range(len(ds)):
        d=pts[i+1]-pts[i];t=max(0,min(1,(q-pts[i]).dot(d)/d.length_squared));dist=(q-pts[i]-t*d).length_squared
        if dist<best[0]:best=(dist,cum[i]+t*ds[i])
    val=best[1]
    for i in range(1,len(cum)-1):
        b=min(ds[i-1],ds[i])*band
        if abs(val-cum[i])<b:return mix({names[i-1]:1},{names[i]:1},(val-cum[i]+b)/(2*b))
    i=next((j for j in range(len(ds)) if val<=cum[j+1]),len(ds)-1)
    return {names[i]:1}

for side,s in [('Left',1),('Right',-1)]:
    sh=Vector((s*.202,.012,1.745));el=Vector((s*.378,.014,1.448));wr=Vector((s*.515,-.006,1.153))
    handdir=(wr-el).normalized();handwidth=Vector((s*.906,0,.424));palmend=wr+handdir*.112
    arm_data[side]=(sh,el,wr)
    bone_specs.extend([(side+'Shoulder',(s*.033,.012,1.765),sh,'Spine2'),(side+'Arm',sh,el,side+'Shoulder'),(side+'ForeArm',el,wr,side+'Arm'),(side+'Hand',wr,palmend,side+'ForeArm')])
    def armw(v,t=0,side=side,sh=sh,el=el,wr=wr,palmend=palmend):
        w=chainweight(v,[sh,el,wr,palmend],[side+'Arm',side+'ForeArm',side+'Hand'],.21)
        if (v-sh).dot((el-sh).normalized())<.06:
            d=(v-sh).dot((el-sh).normalized()); w=mix({'Spine2':.45,side+'Shoulder':.55},w,(d+.045)/.11)
        return w
    secs=[(* (sh-(el-sh).normalized()*.045),.038,.042),(*sh,.061,.058),(*(sh.lerp(el,.26)),.052,.049),(*(sh.lerp(el,.64)),.039,.038),(*el,.027,.028),(*(el.lerp(wr,.17)),.036,.037),(*(el.lerp(wr,.44)),.030,.031),(*(el.lerp(wr,.80)),.018,.019),(*wr,.017,.018),(*(wr+handdir*.025),.019,.020)]
    bodyparts.append(loft(side+'_Arm_seed',secs,armw,28,65))
    # Palms are flattened fans, with genuinely separate four fingers and an opposed thumb.
    def palmw(v,t,side=side,wr=wr,handdir=handdir):
        return mix({side+'ForeArm':1},{side+'Hand':1},((v-wr).dot(handdir)+.019)/.035)
    bodyparts.append(loft(side+'_Palm_seed',[(*wr,.017,.018),(*(wr+handdir*.045),.041,.018),(*(wr+handdir*.089),.044,.015),(*palmend,.038,.013),(*(palmend+handdir*.011),.026,.009)],palmw,32,22))
    fingers=[]
    for index,(name,off,length) in enumerate([('Index',-.028,.133),('Middle',-.009,.149),('Ring',.012,.138),('Little',.032,.11)]):
        start=palmend+handwidth*off+handdir*(-.008 if index in [0,3] else 0)
        spread=handwidth*(off*.68)
        p1=start+handdir*length*.40+spread*.32
        p2=start+handdir*length*.75+spread*.73+Vector((0,-.006,0))
        tip=start+handdir*length+spread+Vector((0,-.012,0))
        points=[start,p1,p2,tip];names=[side+'Hand'+name+str(j) for j in (1,2,3)]
        for j in range(3):bone_specs.append((names[j],points[j],points[j+1],side+'Hand' if j==0 else names[j-1]))
        def fw(v,t,points=points,names=names,side=side):
            w=chainweight(v,points,names,.24)
            d=(v-points[0]).dot((points[1]-points[0]).normalized())
            return mix({side+'Hand':1},w,(d+.013)/.029) if d<.016 else w
        rad=.0108 if index<3 else .0090
        secs=[(*(start-handdir*.016),rad*.9,rad*.8),(*start,rad,rad*.86),(*p1,rad*.80,rad*.76),(*p2,rad*.64,rad*.62),(*(tip-handdir*.008),rad*.44,rad*.42),(*tip,.0013,.0014)]
        bodyparts.append(loft(side+'_'+name+'_seed',secs,fw,16,28))
        fingers.append((name,points,names,fw))
    thumb0=wr+handdir*.042-handwidth*.031
    thumb1=thumb0+handdir*.020-handwidth*.040+Vector((0,-.012,0))
    thumb2=thumb1+handdir*.039-handwidth*.017
    thumbtip=thumb2+handdir*.038+Vector((0,-.009,0))
    pts=[thumb0,thumb1,thumb2,thumbtip];ns=[side+'HandThumb'+str(i) for i in (1,2,3)]
    for j in range(3):bone_specs.append((ns[j],pts[j],pts[j+1],side+'Hand' if j==0 else ns[j-1]))
    def tw(v,t,pts=pts,ns=ns,side=side):
        w=chainweight(v,pts,ns,.24);d=(v-pts[0]).length
        return mix({side+'Hand':1},w,d/.035)
    bodyparts.append(loft(side+'_Thumb_seed',[(*thumb0,.018,.015),(*thumb1,.013,.012),(*thumb2,.010,.009),(*thumbtip,.002,.002)],tw,18,32))
    fingers.append(('Thumb',pts,ns,tw));hand_data[side]=(wr,palmend,handdir,handwidth,fingers)
    hip=Vector((s*.106,.013,1.185));knee=Vector((s*.108,-.018,.687));ank=Vector((s*.099,.02,.17));toe=Vector((s*.102,-.155,.045))
    leg_data[side]=(hip,knee,ank,toe)
    bone_specs.extend([(side+'UpLeg',hip,knee,'Hips'),(side+'Leg',knee,ank,side+'UpLeg'),(side+'Foot',ank,(s*.102,-.115,.055),side+'Leg'),(side+'ToeBase',(s*.102,-.115,.055),toe,side+'Foot')])
    def lw(v,t=0,side=side,hip=hip,knee=knee,ank=ank,toe=toe):
        w=chainweight(v,[hip,knee,ank,toe],[side+'UpLeg',side+'Leg',side+'Foot'],.15)
        if v.z>1.08:w=mix(w,{'Hips':1},(v.z-1.08)/.17)
        return w
    secs=[(*(hip+Vector((0,0,.047))),.060,.057),(*hip,.082,.077),(*(hip.lerp(knee,.18)),.079,.073),(*(hip.lerp(knee,.43)),.063,.060),(*(hip.lerp(knee,.76)),.040,.040),(*knee,.031,.034),(*(knee.lerp(ank,.16)),.039,.046),(*(knee.lerp(ank,.32)),.045,.055),(*(knee.lerp(ank,.60)),.028,.035),(*(knee.lerp(ank,.86)),.017,.024),(*ank,.020,.027),(*(ank+Vector((0,-.017,-.060))),.026,.032)]
    bodyparts.append(loft(side+'_Leg_seed',secs,lw,32,92))
    bodyparts.append(loft(side+'_Foot_seed',[(s*.10,.036,.057,.026,.038),(s*.10,.015,.10,.031,.04),(s*.10,-.025,.080,.033,.041),(s*.102,-.085,.043,.038,.025),(s*.102,-.132,.030,.043,.022),(s*.102,-.166,.024,.037,.018)],lw,26,34))
    for j in range(5):
        x=s*(.069+j*.016);length=.042-j*.003
        bodyparts.append(loft(side+'_Toe'+str(j),[(x,-.144,.027,.0098,.011),(x,-.165,.024,.010,.010),(x,-.165-length,.021,.006,.007),(x,-.171-length,.021,.002,.003)],lambda v,t,side=side:{side+'ToeBase':1},12,12))

print('BUILD: continuous union and skin weights',flush=True)
active(bodyparts[0])
for o in bodyparts:o.select_set(True)
bpy.ops.object.join();body=bpy.context.object;body.name='SERARA_Body'
rem=body.modifiers.new('Continuous tissue union','REMESH');rem.mode='VOXEL';rem.voxel_size=.0030;rem.use_smooth_shade=True;apply(body,rem)
sm=body.modifiers.new('Relax union','SMOOTH');sm.factor=.57;sm.iterations=4;apply(body,sm)
# Shallow biological fenestrae: closed mineral cavities, not fracture or FALL damage.
body.data.materials.append(inner)
cutters=[]
for s in [-1,1]:
    for loc,sc,rot in [
        ((s*.112,-.074,1.567),(.016,.022,.035),s*.5),
        ((s*.093,-.063,1.48),(.013,.021,.034),s*.4),
        ((s*.075,-.056,1.388),(.012,.020,.039),s*.2),
        ((s*.125,-.050,1.191),(.015,.030,.046),s*.45),
        ((s*.133,-.056,1.104),(.014,.029,.047),s*.30),
        ((s*.108,-.046,.688),(.014,.025,.039),0),
        ((s*.108,-.046,.60),(.012,.020,.030),s*.12),
        ((s*.396,-.014,1.433),(.011,.026,.031),-s*.42),
        ((s*.435,-.020,1.361),(.010,.026,.028),-s*.38),
        ((s*.023,.066,1.96),(.008,.015,.034),s*.18),
        ((s*.021,.059,1.866),(.009,.016,.027),s*.16),
        ((s*.022,.095,1.65),(.011,.025,.032),s*.10),
        ((s*.018,.092,1.56),(.010,.023,.028),s*.10),
        ((s*.016,.077,1.46),(.009,.020,.027),s*.10),
        ((s*.019,.087,1.34),(.010,.020,.030),s*.10),
    ]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=14,location=loc)
        c=bpy.context.object;c.scale=sc;c.rotation_euler.y=rot;c.data.materials.append(ivory);c.data.materials.append(inner)
        for p in c.data.polygons:p.material_index=1
        cutters.append(c)
active(cutters[0])
for c in cutters:c.select_set(True)
bpy.ops.object.join();c=bpy.context.object
mod=body.modifiers.new('Anatomical mineral recesses','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=c;apply(body,mod);bpy.data.objects.remove(c,do_unlink=True)
dec=body.modifiers.new('Web body budget','DECIMATE');dec.ratio=min(1,21000/max(1,sum(len(p.vertices)-2 for p in body.data.polygons)));apply(body,dec)
body.vertex_groups.clear()
kd=kdtree.KDTree(len(source_samples))
for i,(co,w) in enumerate(source_samples):kd.insert(co,i)
kd.balance()
groups={}
for v in body.data.vertices:
    w={}
    for co,idx,d in kd.find_n(v.co,5):
        for k,val in source_samples[idx][1].items():w[k]=w.get(k,0)+val/max(.0005,d)**2
    for k,val in normalize(w).items():
        if k not in groups:groups[k]=body.vertex_groups.new(name=k)
        groups[k].add([v.index],val,'REPLACE')
all_mesh=[body]
body_bvh=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get())

def nearest_weights(v,t=0):
    w={}
    for co,idx,d in kd.find_n(v,4):
        for k,val in source_samples[idx][1].items():w[k]=w.get(k,0)+val/max(.001,d)**2
    return normalize(w)

def ribbon(name,points,widths,depths,material=ivory,weight_fn=None,hole=None,res=40,cross=8):
    # Tapered mineral lamina: a solid grown ridge, optionally with a genuine fenestra.
    secs=[(*p,w,d) for p,w,d in zip(points,widths,depths)]
    vs=[];fs=[];ws=[]
    for i in range(res+1):
        t=i/res;p=interp(secs,t);c=Vector(p[:3]);a=Vector(interp(secs,max(0,t-.001))[:3]);b=Vector(interp(secs,min(1,t+.001))[:3]);tan=(b-a).normalized()
        normal=Vector((0,-1 if points[0][1]<=0 else 1,0));u=tan.cross(normal).normalized()
        if u.length<.1:u=Vector((1,0,0))
        for j in range(cross+1):
            q=-1+2*j/cross
            v=c+u*(q*p[3])+normal*(p[4]*(1-q*q))
            if any(word in name for word in ['Costal','Clavicle','Iliac','Scapular','forearm ridge','deltoid','femoral','medial thigh','tibial','Achilles','dorsal','phalanx']):
                hit,norm,idx,dist=body_bvh.find_nearest(v)
                if hit is not None and dist<.065:v=hit+norm*(.0008+max(0,p[4])*(1-q*q)*.45)
            vs.append(tuple(v));ws.append((weight_fn or nearest_weights)(v,0))
        if i:
            for j in range(cross):
                tm=(i-.5)/res;qm=-1+2*(j+.5)/cross
                if hole and ((tm-hole[0])/hole[1])**2+(qm/hole[2])**2<1:continue
                k=(i-1)*(cross+1)+j;fs.append((k,k+1,k+cross+2,k+cross+1))
    o=mesh(name,vs,fs,material,ws)
    sub=o.modifiers.new('Organic lamina smoothing','SUBSURF');sub.levels=1;apply(o,sub)
    sol=o.modifiers.new('Mineral shell thickness','SOLIDIFY');sol.thickness=.0025;sol.offset=0;apply(o,sol)
    return o

print('BUILD: facial shell',flush=True)
# A sculptural face with an angular cheek, deeply cut eyes, small nasal bridge and tapered chin.
face_sections=[(0,-.029,2.014,.009,.015),(0,-.020,2.037,.028,.029),(0,-.007,2.073,.052,.043),(0,.008,2.117,.076,.061),(0,.018,2.159,.101,.076),(0,.024,2.198,.100,.080),(0,.032,2.239,.092,.086),(0,.040,2.275,.078,.082),(0,.046,2.305,.054,.059),(0,.047,2.320,.012,.017)]
def face_sculpt(v,t,a):
    front=max(0,-sin(a));x=v.x;z=v.z
    # Central bridge, nose tip, two swept cheek planes, philtrum and chin.
    v.y-=front**9*(.022*exp(-(x/.014)**2-((z-2.127)/.066)**2)+.018*exp(-(x/.013)**2-((z-2.095)/.015)**2))
    v.y-=front**4*.011*exp(-((abs(x)-.063)/.028)**2-((z-2.127)/.022)**2)
    v.y+=front**6*.012*exp(-((abs(x)-.054)/.027)**2-((z-2.170)/.017)**2)
    v.y-=front**7*.008*exp(-(x/.025)**2-((z-2.059)/.007)**2)
    return v
face=loft('SERARA_Head',face_sections,lambda v,t:{'Head':1},72,92,source=False,sculpt=face_sculpt)
face.data.materials.append(inner)
def cutter_ellipsoid(loc,sc,rot=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=loc);o=bpy.context.object;o.scale=sc;o.rotation_euler.y=rot
    active(o);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(ivory);o.data.materials.append(inner)
    for p in o.data.polygons:p.material_index=1
    return o
for s in [-1,1]:
    cut=cutter_ellipsoid((s*.051,-.063,2.171),(.042,.051,.0165),-s*.34)
    mod=face.modifiers.new('True recessed almond orbit','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cut;apply(face,mod);bpy.data.objects.remove(cut,do_unlink=True)
    # Dark orbit sits behind the carved rim, with only a small internal signal.
    o=ellipsoid(('Left' if s==1 else 'Right')+'_Eye', (s*.051,-.023,2.171),(.035,.022,.0115),eye,lambda v,t:{'Head':1},40,20)
    # Shape eye slant in world coordinates.
    for v in o.data.vertices:v.co.z+=s*.30*(v.co.x-s*.051)
    ellipsoid(('Left' if s==1 else 'Right')+'_Signal',(s*.048,-.0455,2.172),(.0025,.0013,.0019),signal,lambda v,t:{'Head':1},20,12)
# Remove upper rear shell sectors to create a skeletal cranium instead of a smooth helmet.
for s in [-1,1]:
    for loc,sc in [((s*.078,.012,2.235),(.034,.040,.025)),((s*.060,.046,2.283),(.034,.045,.022)),((s*.093,.043,2.193),(.024,.036,.019)),((s*.043,-.040,2.293),(.014,.020,.024)),((s*.059,-.047,2.263),(.018,.021,.024)),((s*.076,-.030,2.228),(.016,.022,.018))]:
        cut=cutter_ellipsoid(loc,sc)
        mod=face.modifiers.new('Grown cranial fenestra','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cut;apply(face,mod);bpy.data.objects.remove(cut,do_unlink=True)
bev=face.modifiers.new('Soft mineral cavity edges','BEVEL');bev.width=.0017;bev.segments=2;apply(face,bev)
for p in face.data.polygons:
    c=p.center
    if c.y>.006 and c.z>2.20:p.material_index=1

# Mouth is a narrow modeled seam, not painted makeup.
tube('Mouth seam',[(-.023,-.053,2.059),(-.011,-.060,2.060),(0,-.064,2.058),(.011,-.060,2.060),(.023,-.053,2.059)],[.0006,.0012,.0014,.0012,.0006],lambda v,t:{'Head':1},inner,8,28)
for s in [-1,1]:
    tube('Nostril',[(s*.009,-.072,2.091),(s*.007,-.077,2.090),(s*.003,-.078,2.092)],[.0008,.0011,.0005],lambda v,t:{'Head':1},inner,8,12)

print('BUILD: cranial lattice and neck integration',flush=True)
for s in [-1,1]:
    # Broad recurved cranial blades grow from cheek and brow into the cranium.
    ribbon('Cranium temporal arch',[(s*.062,-.034,2.075),(s*.104,-.012,2.145),(s*.114,.016,2.211),(s*.083,.045,2.302),(s*.038,.043,2.378)],[.001,.017,.025,.020,.0008],[.001,.006,.007,.006,.001],weight_fn=lambda v,t:{'Head':1},hole=(.60,.18,.55),res=45,cross=10)
    ribbon('Swept brow to parietal blade',[(s*.017,-.062,2.179),(s*.060,-.049,2.202),(s*.103,-.012,2.228),(s*.092,.060,2.294),(s*.047,.100,2.355)],[.001,.008,.019,.020,.001],[.001,.002,.005,.006,.001],weight_fn=lambda v,t:{'Head':1},hole=(.67,.17,.52),res=45,cross=10)
    ribbon('Cheek to occipital flange',[(s*.030,-.041,2.043),(s*.073,-.021,2.112),(s*.102,.029,2.178),(s*.081,.090,2.252),(s*.028,.116,2.302)],[.001,.010,.021,.016,.001],[.001,.002,.005,.004,.001],weight_fn=lambda v,t:{'Head':1},hole=(.60,.2,.55),res=40,cross=10)
    ribbon('Cranium frontal web',[(s*.011,-.052,2.246),(s*.041,-.031,2.296),(s*.050,.003,2.337),(s*.029,.030,2.374),(s*.007,.027,2.395)],[.001,.020,.022,.012,.001],[.001,.003,.004,.003,.001],weight_fn=lambda v,t:{'Head':1},hole=(.61,.19,.63),res=44,cross=12)
    for j in range(3):
        ribbon('Cranial trabecula',[(s*(.062+j*.007),.072,2.145+j*.036),(s*.099,.076,2.190+j*.032),(s*.064,.113,2.245+j*.027),(s*.009,.117,2.268+j*.025)],[.001,.010,.008,.001],[.001,.003,.003,.001],rim,lambda v,t:{'Head':1},hole=(.55,.24,.57),res=28,cross=8)
    # Neck tendons run through clavicles; there is no collar or mechanical joint.
    ribbon('Sternomastoid lamina',[(s*.052,-.011,2.066),(s*.044,-.026,1.986),(s*.047,-.035,1.882),(s*.095,-.041,1.80),(s*.211,-.012,1.767)],[.002,.012,.011,.023,.001],[.001,.003,.003,.004,.001],hole=(.65,.13,.5),res=48,cross=8)
    ribbon('Anterior neck root',[(s*.011,-.044,2.028),(s*.019,-.044,1.930),(s*.026,-.044,1.833),(0,-.072,1.757)],[.001,.007,.012,.001],[.001,.002,.003,.001],res=40,cross=6)
    ribbon('Posterior neck web',[(s*.060,.073,2.123),(s*.035,.055,1.989),(s*.043,.055,1.860),(s*.177,.049,1.757)],[.001,.013,.018,.001],[.001,.003,.005,.001],hole=(.59,.21,.56),res=44,cross=10)
    # Three nested rib sweeps and iliac crests follow the organic torso silhouette.
    for j in range(3):
        z=1.61-j*.074
        ribbon('Costal mineral sweep',[(s*.010,-.079,z-.099),(s*.073,-.077,z-.035),(s*(.142-j*.016),-.050,z+.035),(s*(.139-j*.016),.033,z+.059)],[.001,.012,.015,.001],[.001,.004,.005,.001],hole=(.68,.15,.55),res=34,cross=8)
    ribbon('Clavicle blade',[(s*.008,-.071,1.721),(s*.073,-.092,1.746),(s*.143,-.055,1.778),(s*.220,-.010,1.751)],[.001,.014,.020,.001],[.001,.003,.004,.001],hole=(.67,.17,.5),res=32,cross=8)
    ribbon('Iliac arc',[(s*.015,-.080,1.133),(s*.078,-.078,1.244),(s*.143,-.022,1.277),(s*.148,.034,1.192)],[.001,.014,.025,.001],[.001,.004,.005,.001],hole=(.72,.15,.5),res=34,cross=8)
    for j in range(3):
        ribbon('Scapular sweep',[(s*.008,.091,1.46+j*.071),(s*.074,.083,1.55+j*.065),(s*.136,.050,1.59+j*.067)],[.001,.018,.001],[.001,.003,.001],hole=(.52,.23,.5),res=30,cross=8)

# Central crest is a laminar extension of the forehead, matching the head-study crown.
ribbon('Sagittal living crest',[(0,-.071,2.188),(0,-.060,2.260),(0,-.026,2.318),(0,.014,2.390),(0,.025,2.400)],[.003,.021,.020,.011,.003],[.001,.004,.003,.002,.001],weight_fn=lambda v,t:{'Head':1},res=46,cross=8)

# Merge the cranial laminae into the face so the crest reads as grown anatomy.
head_parts=[o for o in bpy.data.objects if o.type=='MESH' and (o==face or any(o.name.startswith(p) for p in ['Cranium','Swept brow','Cheek to occipital','Cranial trabecula','Sagittal living']))]
head_material_samples=[]
for o in head_parts:
    o.data.update()
    for p in o.data.polygons:
        head_material_samples.append((p.center.copy(),o.data.materials[p.material_index].name))
active(face)
for o in head_parts:o.select_set(True)
bpy.ops.object.join();face=bpy.context.object
rem=face.modifiers.new('Grown continuous cranial structure','REMESH');rem.mode='VOXEL';rem.voxel_size=.0009;rem.use_smooth_shade=True;apply(face,rem)
sm=face.modifiers.new('Cranial surface relaxation','SMOOTH');sm.factor=.65;sm.iterations=4;apply(face,sm)
dec=face.modifiers.new('Cranial web budget','DECIMATE');dec.ratio=min(1,23000/max(1,sum(len(p.vertices)-2 for p in face.data.polygons)));apply(face,dec)
hk=kdtree.KDTree(len(head_material_samples))
for i,(co,name) in enumerate(head_material_samples):hk.insert(co,i)
hk.balance();face.data.materials.clear()
for m in [ivory,inner,rim]:face.data.materials.append(m)
for p in face.data.polygons:
    _,idx,_=hk.find(p.center);name=head_material_samples[idx][1];p.material_index={'SERARA_Porcelain':0,'SERARA_InnerMineral':1,'SERARA_CavityRim':2}.get(name,0)
face.vertex_groups.clear();g=face.vertex_groups.new(name='Head');g.add(list(range(len(face.data.vertices))),1,'REPLACE')

print('BUILD: limb and hand mineral anatomy',flush=True)
for side,s in [('Left',1),('Right',-1)]:
    sh,el,wr=arm_data[side]
    # Forearm extensor sweep and small elbow fenestra; no separate armor cuffs.
    ribbon(side+' forearm ridge',[(s*.375,-.010,1.469),(s*.418,-.024,1.402),(s*.467,-.034,1.276),(s*.515,-.022,1.158)],[.001,.024,.017,.001],[.001,.003,.003,.001],hole=(.23,.13,.55),res=40,cross=8)
    ribbon(side+' deltoid sweep',[(s*.164,-.027,1.78),(s*.223,-.048,1.731),(s*.269,-.039,1.635),(s*.326,-.014,1.529)],[.001,.023,.017,.001],[.001,.004,.003,.001],res=36,cross=8)
    hip,knee,ank,toe=leg_data[side]
    ribbon(side+' femoral blade',[(s*.136,-.030,1.243),(s*.151,-.058,1.138),(s*.128,-.077,.961),(s*.109,-.053,.735)],[.001,.033,.030,.001],[.001,.004,.004,.001],hole=(.30,.14,.47),res=46,cross=10)
    ribbon(side+' medial thigh root',[(s*.079,-.046,1.164),(s*.064,-.058,1.048),(s*.085,-.055,.894),(s*.109,-.052,.743)],[.001,.014,.010,.001],[.001,.002,.002,.001],res=36,cross=6)
    ribbon(side+' tibial lamina',[(s*.108,-.051,.725),(s*.108,-.052,.641),(s*.106,-.038,.504),(s*.101,-.015,.300),(s*.099,-.013,.149)],[.001,.018,.019,.009,.001],[.001,.003,.003,.002,.001],hole=(.23,.115,.60),res=50,cross=10)
    ribbon(side+' Achilles lamina',[(s*.111,.045,.64),(s*.111,.087,.506),(s*.104,.051,.319),(s*.099,.052,.097)],[.001,.012,.009,.001],[.001,.003,.002,.001],hole=(.72,.15,.5),res=36,cross=8)
    wr,pe,hd,hw,fingers=hand_data[side]
    for name,points,names,fw in fingers:
        if name!='Thumb':
            start=wr+hd*.019+hw*((points[0]-pe).dot(hw)*.40)+Vector((0,.015,0))
            end=points[0]+Vector((0,.013,0))
            ribbon(side+' dorsal '+name,[start,start.lerp(end,.46),end],[.001,.006,.002],[.001,.002,.001],weight_fn=lambda v,t,side=side:{side+'Hand':1},res=18,cross=6)
        for j in range(3):
            a=points[j];b=points[j+1]
            # Subtle long knuckle-to-tip mineral ridge; still skinned at each joint.
            offset=Vector((0,.008 if j==0 else .005,0))
            ribbon(side+' '+name+' phalanx '+str(j+1),[a+offset,a.lerp(b,.5)+offset,b+offset*.6],[.001,.004 if j<2 else .003,.0007],[.001,.0015,.0005],weight_fn=fw,res=12,cross=4)

# Dark inset throat is anatomical substrate, never a damage state.
for s in [-1,1]:
    ribbon('Throat inner window',[(s*.012,-.040,2.010),(s*.018,-.044,1.943),(s*.018,-.045,1.871),(s*.009,-.061,1.803)],[.001,.009,.010,.001],[.0005,.001,.001,.0005],inner,lambda v,t:wz(v.z),res=32,cross=6)

print('BUILD: rig and normalize',flush=True)
arm=bpy.data.armatures.new('SERARA_Humanoid');rig=bpy.data.objects.new('SERARA_Rig',arm);scene.collection.objects.link(rig)
active(rig);bpy.ops.object.mode_set(mode='EDIT')
for name,head,tail,parent in bone_specs:
    b=arm.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=arm.edit_bones[parent]
    b.use_deform=name!='Root'
    if name!='Root':b.align_roll(Vector((0,1,0)))
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True;arm.display_type='OCTAHEDRAL'
# Consolidate accessories by semantic material; skin remains editable and head independent.
accessories=[o for o in bpy.data.objects if o.type=='MESH' and o not in (body,face)]
for material in [ivory,inner,rim,eye,signal]:
    obs=[o for o in bpy.data.objects if o.type=='MESH' and o not in (body,face) and o.data.materials and o.data.materials[0]==material]
    if obs:
        active(obs[0])
        for o in obs:o.select_set(True)
        bpy.ops.object.join();bpy.context.object.name={'SERARA_Porcelain':'SERARA_MineralLaminae','SERARA_InnerMineral':'SERARA_Cavities','SERARA_CavityRim':'SERARA_CranialLattice','SERARA_EyeObsidian':'SERARA_Eyes','SERARA_InternalSignal':'SERARA_Signal'}[material.name]
meshes=[o for o in bpy.data.objects if o.type=='MESH']
access_tri=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes if o not in (body,face))
for o in meshes:
    tris=sum(len(p.vertices)-2 for p in o.data.polygons)
    ratio=min(1,23000/max(1,tris)) if o==face else (min(1,22000/max(1,access_tri)) if o!=body else 1)
    if ratio<.99:
        dec=o.modifiers.new('Web surface budget','DECIMATE');dec.ratio=ratio;apply(o,dec)
for o in meshes:
    # Remove loose verts, recalculate normals, normalize and cap bone influences.
    active(o);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.delete_loose();bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    for p in o.data.polygons:p.use_smooth=True
    for v in o.data.vertices:
        weights={o.vertex_groups[g.group].name:g.weight for g in v.groups if g.weight>1e-6}
        if not weights:weights=nearest_weights(v.co)
        # Spatially continuous analytical joint envelopes replace nearest-sample noise.
        x,y,z=v.co;side='Left' if x>=0 else 'Right'
        if o!=face and not (set(weights)=={'Head'}):
            if abs(x)>.245:
                sh,el,wr=arm_data[side];hd=hand_data[side][2]
                aw=chainweight(v.co,[sh,el,wr,hand_data[side][1]],[side+'Arm',side+'ForeArm',side+'Hand'],.30)
                d=(v.co-sh).dot((el-sh).normalized())
                if d<.085:aw=mix({'Spine2':.25,side+'Shoulder':.75},aw,(d+.04)/.125)
                distal=(v.co-wr).dot(hd)
                weights=mix(aw,weights,(distal+.012)/.040)
            elif z<1.25:
                if z>.99:
                    leg=smooth((1.245-z)/.245)
                    left=smooth((x+.033)/.066)
                    weights={'Hips':1-leg,'LeftUpLeg':leg*left,'RightUpLeg':leg*(1-left)}
                elif z>.57:
                    weights=mix({side+'Leg':1},{side+'UpLeg':1},(z-.595)/.185)
                elif z>.12:
                    weights=mix({side+'Foot':1},{side+'Leg':1},(z-.11)/.13)
                else:
                    weights=mix({side+'Foot':1},{side+'ToeBase':1},(-y-.10)/.065)
            elif abs(x)>.145 and z<1.82:
                sh,el,wr=arm_data[side]
                aw=chainweight(v.co,[sh,el,wr,hand_data[side][1]],[side+'Arm',side+'ForeArm',side+'Hand'],.30)
                d=(v.co-sh).dot((el-sh).normalized())
                if d<.085:aw=mix({'Spine2':.25,side+'Shoulder':.75},aw,(d+.04)/.125)
                weights=mix(wz(z),aw,(abs(x)-.145)/.085)
            else:weights=wz(z)
        clean=normalize(weights)
        for g in list(v.groups):o.vertex_groups[g.group].remove([v.index])
        for k,w in clean.items():
            g=o.vertex_groups.get(k) or o.vertex_groups.new(name=k);g.add([v.index],w,'REPLACE')
    mod=o.modifiers.new('SERARA linear skin','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=False
    o.parent=None
    # Basic UVs for downstream procedural material replacement.
    for old_uv in list(o.data.uv_layers):o.data.uv_layers.remove(old_uv)
    uv=o.data.uv_layers.new(name='SERARA_UV')
    for p in o.data.polygons:
        for li in p.loop_indices:
            v=o.data.vertices[o.data.loops[li].vertex_index].co
            uv.data[li].uv=(.5+math.atan2(v.x,-v.y)/(2*pi),v.z/2.4)
    o['character']='SERARA';o['base_state']='NEUTRAL';o['damage_baked']=False

# Practical, restrained expression targets; values stay zero in canonical rest pose.
face.shape_key_add(name='Basis')
for name in ['FACE_RELAXED','FACE_TENSION','FACE_FALL','EYES_NARROW','MOUTH_SEAM_OPEN']:
    key=face.shape_key_add(name=name)
    for v in key.data:
        x,y,z=v.co;front=exp(-((y+.065)/.043)**2)
        if name in ['FACE_TENSION','EYES_NARROW']:
            g=exp(-((abs(x)-.051)/.039)**2-((z-2.177)/.028)**2)*front
            v.co.z-=g*(.002 if name=='FACE_TENSION' else .005)
        elif name=='MOUTH_SEAM_OPEN':
            g=exp(-(x/.033)**2-((z-2.050)/.020)**2)*front;v.co.z-=g*.006
        elif name=='FACE_FALL':
            g=exp(-((abs(x)-.050)/.035)**2-((z-2.168)/.028)**2)*front;v.co.z-=g*.003
        else:
            g=exp(-((abs(x)-.034)/.04)**2-((z-2.075)/.055)**2)*front;v.co.y-=g*.001
    key.value=0

rig['height_m']=2.4;rig['rest_pose']='Relaxed A-pose';rig['forward_blender']='-Y';rig['forward_gltf']='+Z';rig['state_effects']='Grace/Tension/Fall supplied by runtime; no baked damage'
rig['finger_chains']='5 per hand; thumb plus index/middle/ring/little, 3 phalanges each'

# Include source references as packed images and a text brief, without exporting them.
refs=bpy.data.collections.new('REFERENCES - viewport only');scene.collection.children.link(refs)
for name in ['SERARA_HEAD_STUDY.png','SERARA_CANONICAL_TURNAROUND.png']:
    im=bpy.data.images.load(str(ROOT/'work'/'source_pack'/'references'/name));im.pack()
txt=bpy.data.texts.new('FULL_BUILD_BRIEF.txt');txt.write((ROOT/'work/source_pack/FULL_BUILD_BRIEF.txt').read_text(encoding='utf-8'))
readme=bpy.data.texts.new('SERARA_README');readme.write('Original procedural model authored from supplied references. No external base mesh. Neutral rest pose; 5 articulated digits per hand. Select SERARA_Rig to pose. Expression targets are subtle and uncalibrated; all default to zero. Runtime state damage is not baked. See WORK_LOG and verification report for acceptance limits.')

scene.render.engine='BLENDER_WORKBENCH';scene.render.resolution_x=1100;scene.render.resolution_y=1300;scene.render.resolution_percentage=100
scene.world.color=(.075,.075,.075)
scene.display.shading.light='STUDIO';scene.display.shading.studiolight_rotate_z=.3;scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH';scene.display.shading.curvature_ridge_factor=1.4;scene.display.shading.curvature_valley_factor=1.0;scene.display.shading.background_type='WORLD'
def camera(name,loc,target,scale):
    bpy.ops.object.camera_add(location=loc);o=bpy.context.object;o.name=name;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=scale;return o
cam=camera('ReviewCamera',(3.5,-8,3.3),(0,0,1.2),2.66);scene.camera=cam
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_distance=3.3;area.spaces.active.region_3d.view_location=(0,0,1.2);area.spaces.active.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
active(rig)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'SERARA_CANONICAL.blend'))
active(rig)
for o in meshes:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'SERARA_CANONICAL.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=True,export_morph=True,export_yup=True,export_apply=False,export_extras=True)
stats={'mesh_count':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'bones':len(arm.bones),'height_m':max(v.co.z for o in meshes for v in o.data.vertices)-min(v.co.z for o in meshes for v in o.data.vertices),'objects':[{ 'name':o.name,'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons)} for o in meshes]}
(OUT/'BUILD_STATS.json').write_text(json.dumps(stats,indent=2))
print('BUILD_STATS',json.dumps(stats),flush=True)
scene.render.filepath=str(ROOT/'work'/'review_three_quarter.png');bpy.ops.render.render(write_still=True)
cam.location=(0,-8,1.21);cam.rotation_euler=(Vector((0,0,1.21))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.58
scene.render.filepath=str(ROOT/'work'/'review_front.png');bpy.ops.render.render(write_still=True)
cam.location=(.8,-2.2,2.25);cam.rotation_euler=(Vector((0,.02,2.16))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=.59
scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.filepath=str(ROOT/'work'/'review_head.png');bpy.ops.render.render(write_still=True)
print('BUILD COMPLETE',flush=True)

