#!/bin/bash
BASE="http://localhost:4000"
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@example.com","password":"Admin@123456"}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))')
H="Authorization: Bearer $TOKEN"
P=0; F=0; T=0
chk(){ T=$((T+1));[ $? -eq 0 ]&&{ P=$((P+1));echo "✅ $1"; }||{ F=$((F+1));echo "❌ $1"; }; }
echo "=== 1. PROJECTS ==="
curl -s -X POST $BASE/projects -H "Content-Type: application/json" -H "$H" -d '{"name":"Test","description":"T"}'>/tmp/p.json
PID=$(python3 -c "import json;print(json.load(open('/tmp/p.json')).get('id',''))")
[ -n "$PID" ]&&chk "Create project"||echo "❌ Create project"
curl -s $BASE/projects/$PID -H "$H">/dev/null&&chk "Get project"||echo "❌ Get"
curl -s -X PUT $BASE/projects/$PID -H "Content-Type: application/json" -H "$H" -d '{"name":"Upd"}'>/dev/null&&chk "Update project"||echo "❌ Update"
curl -s $BASE/projects -H "$H">/dev/null&&chk "List projects"||echo "❌ List"
echo "=== 2. LAYERS ==="
curl -s $BASE/projects/$PID/folders -H "$H">/tmp/f.json
FID=$(python3 -c "import json;d=json.load(open('/tmp/f.json'));print(d[0]['id'])")
LID=$(python3 -c "import json;d=json.load(open('/tmp/f.json'));print(d[0]['children'][0]['id'])")
[ -n "$LID" ]&&chk "Get folders (f=$FID l=$LID)"||echo "❌ Folders"
echo "=== 3. POLYGONS ==="
curl -s -X POST $BASE/projects/$PID/polygons -H "Content-Type: application/json" -H "$H" -d '{"name":"P1","coordinates":{"type":"Polygon","coordinates":[[[37.6,55.7],[37.61,55.7],[37.61,55.71],[37.6,55.71],[37.6,55.7]]]}}'>/tmp/pg.json
PID2=$(python3 -c "import json;print(json.load(open('/tmp/pg.json')).get('id',''))")
[ -n "$PID2" ]&&chk "Create polygon"||echo "❌ Polygon"
curl -s $BASE/projects/$PID/polygons -H "$H">/dev/null&&chk "List polygons"||echo "❌ List"
curl -s $BASE/polygons/$PID2 -H "$H">/dev/null&&chk "Get polygon"||echo "❌ Get"
curl -s -X PUT $BASE/polygons/$PID2 -H "Content-Type: application/json" -H "$H" -d '{"name":"Upd"}'>/dev/null&&chk "Update polygon"||echo "❌ Update"
echo "=== 4. LAYER OBJECTS ==="
curl -s -X POST $BASE/projects/$PID/polygons -H "Content-Type: application/json" -H "$H" -d "{\"name\":\"P2\",\"coordinates\":{\"type\":\"Polygon\",\"coordinates\":[[[37.62,55.72],[37.63,55.72],[37.63,55.73],[37.62,55.73],[37.62,55.72]]]},\"layerFolderId\":$LID}" > /dev/null && chk "Polygon on layer" || echo "❌ Layer"
curl -s $BASE/projects/layers/$LID/objects -H "$H">/tmp/lo.json
LOID=$(python3 -c "import json;d=json.load(open('/tmp/lo.json'));print(d[0]['id'])")
[ -n "$LOID" ]&&chk "Layer objects (id=$LOID)"||echo "❌ Objects"
curl -s -X PUT $BASE/projects/layer-objects/$LOID -H "Content-Type: application/json" -H "$H" -d '{"isVisible":false}'>/dev/null&&chk "Update layer obj"||echo "❌ Update obj"
curl -s -X DELETE $BASE/projects/layer-objects/$LOID -H "$H">/dev/null&&chk "Delete layer obj"||echo "❌ Delete obj"
echo "=== 5. LAND PLOTS ==="
curl -s -X POST $BASE/projects/$PID/land-plots -H "Content-Type: application/json" -H "$H" -d "{\"cadastral_number\":\"T:1:1:1\",\"area\":1000,\"address\":\"Addr\",\"polygon_id\":$PID2}" > /tmp/lp.json
LPID=$(python3 -c "import json;print(json.load(open('/tmp/lp.json')).get('id',''))")
[ -n "$LPID" ]&&chk "Create land plot"||echo "❌ Land plot"
curl -s $BASE/projects/$PID/land-plots -H "$H">/dev/null&&chk "List land plots"||echo "❌ List LP"
curl -s -X PUT $BASE/projects/land-plots/$LPID -H "Content-Type: application/json" -H "$H" -d '{"address":"Upd"}'>/dev/null&&chk "Update land plot"||echo "❌ Update LP"
echo "=== 6. COMMENTS ==="
curl -s -X POST $BASE/projects/$PID/comments -H "Content-Type: application/json" -H "$H" -d '{"lat":55.7558,"lng":37.6173,"text":"Comment","status":"open"}'>/tmp/c.json
CID=$(python3 -c "import json;print(json.load(open('/tmp/c.json')).get('id',''))")
[ -n "$CID" ]&&chk "Create comment"||echo "❌ Comment"
curl -s $BASE/projects/$PID/comments -H "$H">/dev/null&&chk "List comments"||echo "❌ List C"
curl -s -X PUT $BASE/projects/comments/$CID -H "Content-Type: application/json" -H "$H" -d '{"text":"Upd","status":"resolved"}'>/dev/null&&chk "Update comment"||echo "❌ Update C"
curl -s -X DELETE $BASE/projects/comments/$CID -H "$H">/dev/null&&chk "Delete comment"||echo "❌ Delete C"
echo "=== 7. EVENTS ==="
curl -s -X POST $BASE/projects/$PID/events -H "Content-Type: application/json" -H "$H" -d '{"type":"meeting","title":"Event","description":"D","goal":"Goal","eventDate":"2025-06-15","eventTime":"14:30","locationName":"Office","locationLat":55.75,"locationLng":37.61,"locationAddress":"Addr","dueDate":"2025-06-15T14:30:00Z"}'>/tmp/e.json
EID=$(python3 -c "import json;print(json.load(open('/tmp/e.json')).get('id',''))")
[ -n "$EID" ]&&chk "Create event"||echo "❌ Event"
curl -s $BASE/projects/$PID/events -H "$H">/dev/null&&chk "List events"||echo "❌ List E"
curl -s -X PUT $BASE/projects/events/$EID -H "Content-Type: application/json" -H "$H" -d '{"title":"Upd","isDone":true}'>/dev/null&&chk "Update event"||echo "❌ Update E"
curl -s -X DELETE $BASE/projects/events/$EID -H "$H">/dev/null&&chk "Delete event"||echo "❌ Delete E"
echo "=== 8. FOLDERS CRUD ==="
curl -s -X POST $BASE/projects/$PID/folders -H "Content-Type: application/json" -H "$H" -d '{"type":"folder","name":"Folder","parentId":null}'>/tmp/ff.json
FFID=$(python3 -c "import json;print(json.load(open('/tmp/ff.json')).get('id',''))")
[ -n "$FFID" ]&&chk "Create folder"||echo "❌ Folder"
curl -s -X POST $BASE/projects/$PID/folders -H "Content-Type: application/json" -H "$H" -d "{\"type\":\"folder\",\"name\":\"Sub\",\"parentId\":$FFID}" > /dev/null && chk "Create subfolder" || echo "❌ Subfolder"
curl -s -X PUT $BASE/projects/folders/$FFID -H "Content-Type: application/json" -H "$H" -d '{"name":"Upd"}'>/dev/null&&chk "Update folder"||echo "❌ Update F"
curl -s -X DELETE $BASE/projects/folders/$FFID -H "$H">/dev/null&&chk "Delete folder"||echo "❌ Delete F"
echo "=== 9. NSPD + GEO ==="
curl -s $BASE/projects/nspd/layers -H "$H">/dev/null&&chk "NSPD layers"||echo "❌ NSPD"
curl -s "$BASE/projects/nspd/map/url?layerId=1&minLng=37&minLat=55&maxLng=38&maxLat=56" -H "$H">/dev/null&&chk "Map URL"||echo "❌ Map"
curl -s "$BASE/projects/polygons/search/nearest?lat=55.75&lon=37.61&limit=5" -H "$H">/dev/null&&chk "Nearest polygons"||echo "❌ Nearest"
curl -s -X POST $BASE/projects/polygons/search/intersections -H "Content-Type: application/json" -H "$H" -d '{"coordinates":{"type":"Polygon","coordinates":[[[37.6,55.7],[37.61,55.7],[37.61,55.71],[37.6,55.71],[37.6,55.7]]]}}'>/dev/null&&chk "Intersections"||echo "❌ Intersect"
echo "=== 10. CACHE + MEMBERS + VIEWS ==="
curl -s $BASE/projects/nspd/cache/stats -H "$H">/dev/null&&chk "Cache stats"||echo "❌ Cache"
curl -s -X POST $BASE/projects/$PID/members -H "Content-Type: application/json" -H "$H" -d '{"userId":2,"role":"editor"}'>/dev/null&&chk "Add member"||echo "❌ Member"
curl -s $BASE/projects/$PID/members -H "$H">/dev/null&&chk "List members"||echo "❌ Members"
curl -s -X POST $BASE/projects/$PID/map-views -H "Content-Type: application/json" -H "$H" -d '{"lat":55.75,"lng":37.61,"zoom":12}'>/dev/null&&chk "Create map view"||echo "❌ Map view"
curl -s $BASE/projects/$PID/map-views -H "$H">/dev/null&&chk "List map views"||echo "❌ List views"
echo "=== 11. CLEANUP ==="
curl -s -X DELETE $BASE/projects/$PID -H "$H">/dev/null&&chk "Delete project"||echo "❌ Delete"
echo -e "\n========== RESULTS =========="
echo "✅ Passed: $P/$T"
echo "❌ Failed: $F/$T"
exit $F
