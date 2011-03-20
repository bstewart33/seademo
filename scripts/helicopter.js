var dmz =
       { saeConst: require("saeConst")
       , defs: require("dmz/runtime/definitions")
       , object: require("dmz/components/object")
       , objectType: require("dmz/runtime/objectType")
       , module: require("dmz/runtime/module")
       , undo: require("inspectorUndo")
       }
  // Constants
  , HelicopterType = dmz.objectType.lookup("Helicopter")
  , TrunRate = (Math.PI * 0.5)
  , Speed = 50
  , Forward = dmz.vector.Forward
  , Right = dmz.vector.Right
  , Up = dmz.vector.Up
  , Lead = self.config.number("target-lead.value", 6)
  // Functions
  , _rotate
  , _newOri
  // Variables
//  , _helos =
//    { group: { list: {} }
//    , list: {}
//    }
  ;

_rotate = function (time, orig, target) {

   var result = target
   ,   diff = target - orig
   ,   max = time * TurnRate
   ;

   if (diff > Math.PI) { diff -= Math.PI * 2; }
   else if (diff < -Math.PI)  { diff += Math.PI * 2; }

   if (Math.abs(diff) > max) {

      if (diff > 0) { result = orig + max; }
      else { result = orig - max; }
   }

   return result;
};

_newOri = function (obj, time, targetVec) {

   var result = dmz.matrix.create()
     , hvec = dmz.vector.create(targetVec)
     , heading
     , hcross
     , pitch
     , pcross
     , ncross
     , pm
     ;

   hvec.y = 0.0;
   hvec = hvec.normalize();
   heading = Forward.getAngle(hvec);

   hcross = Forward.cross(hvec).normalize();

   if (hcross.y < 0.0) { heading = (Math.PI * 2) - heading; }

   if (heading > Math.PI) { heading = heading - (Math.PI * 2); }
   else if (heading < -Math.PI) { heading = heading + (Math.PI * 2); }

   pitch = targetVec.getAngle(hvec);
   pcross = targetVec.cross(hvec).normalize();
   ncross = hvec.cross(pcross);

   if (ncross.y < 0.0) { pitch = (Math.PI * 2) - pitch; }

   obj.heading = rotate(time, obj.heading, heading);

   obj.pitch = rotate(time, obj.pitch, pitch);

   pm = dmz.matrix.create().fromAxisAndAngle(Right, obj.pitch);

   result = result.fromAxisAndAngle(Up, obj.heading);

   result = result.multiply(pm);

   return result;
};

dmz.object.create.observe(self, function (handle, type) {

   if (type.isOfType(HelicopterType)) {

      _helos.list[handle] = { handle: handle };
   }
});

dmz.object.link.observe(self, dmz.seaConst.NetLink,
function (linkObjHandle, attrHandle, superHandle, subHandle) {

   var obj = _helos.list[superHandle];
   if (obj) { _helos.group[subHandle].list[superHandle] = obj; }
});


dmz.object.unlink.observe(self, dmz.seaConst.NetLink,
function (linkObjHandle, attrHandle, superHandle, subHandle) {

   delete _helos.group[subHandle].list[superHandle];
   delete _helos.list[superHandle];
});

dmz.time.setRepeatingTimer(self, function (Delta) {

   Object.keys(_helos.group).forEach(function(key) {

      Object.keys(_helos.group[key].list).forEach(function(key) {

         var obj = _helos.group[key].list
           , handle = obj.handle
           , pos = dmz.object.position(handle)
           , vel = dmz.object.velocity(handle)
           , ori = dmz.object.orientation(handle)
           , origPos
           , offset
           , speed
           , targetPos
           , targetOri
           , targetDir
           , distance
           ;

         if (obj.target) {

            targetPos = dmz.object.position(obj.target);
            targetOri = dmz.object.orientation(obj.target);

            if (targetPos && targetOri) {

               targetPos = targetPos.add(targetOri.transform(Forward.multipyConst(Lead)));
               offset = targetPos.subtract(pos);
               targetDir = offset.normalize();

               ori = newOri(obj, Delta, targetDir);

               distance = offset.magnitude ();
            }
         }
      });
   });
});
