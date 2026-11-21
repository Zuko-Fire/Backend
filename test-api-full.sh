#!/bin/bash
BASE="http://localhost:4000"
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@example.com","password":"Admin@123456"}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("access_token",""))')
H="Authorization: Bearer $TOKEN"

echo "=========================================="
echo "1. POST /projects — Create project"
echo "=========================================="
curl -s -X POST $BASE/projects -H "Content-Type: application/json" -H "$H" -d '{"name":"Test API","description":"Testing all endpoints"}' | python3 -m json.tool

echo -e "\n=========================================="
echo "2. GET /projects/:id — Get project"
echo "=========================================="
PID=$(curl -s -X POST $BASE/projects -H "Content-Type: application/json" -H "$H" -d '{"name":"Show Project","description":"D"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
curl -s $BASE/projects/$PID -H "$H" | python3 -m json.tool

echo -e "\n=========================================="
echo "3. PUT /projects/:id — Update project"
echo "=========================================="
curl -s -X PUT $BASE/projects/$PID -H "Content-Type: application/json" -H "$H" -d '{"name":"Updated Project"}' | python3 -m json.tool

echo -e "\n=========================================="
echo "4. GET /projects — List projects"
echo "=========================================="
curl -s $BASE/projects -H "$H" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(f"Total: {len(d)} projects");[print(f"  - id={p[\"id\"]} name={p[\"name\"]} status={p[\"status\"]}") for p in d[:5]]'

echo -e "\n=========================================="
echo "5. GET /projects/:id/folders — Auto-created layers"
echo "=========================================="
curl -s $BASE/projects/$PID/folders -H "$H" | python3 -m json.tool

echo -e "\n=========================================="
echo "6. POST /projects/:id/polygons — Create polygon"
echo "=========================================="
curl -s -X POST $BASE/projects/$PID/polygons -H "Content-Type: application/json" -H "$H" -d '{"name":"Test Poly","coordinates":{"type":"Polygon","coordinates":[[[37.6,55.7],[37.61,55.7],[37.61,55.71],[37.6,55.71],[37.6,55.7]]]}}' | python3 -m json.tool

echo -e "\n=========================================="
echo "7. POST /projects/:id/polygons — Create polygon WITH layerFolderId"
echo "=========================================="
LID=$(curl -s $BASE/projects/$PID/folders -H "$H" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["children"][0]["id"])')
curl -s -X POST $BASE/projects/$PID/polygons -H "Content-Type: application/json" -H "$H" -d "{\"name\":\"Layer Poly\",\"coordinates\":{\"type\":\"Polygon\",\"coordinates\":[[[37.62,55.72],[37.63,55.72],[37.63,55.73],[37.62,55.73],[37.62,55.72]]]},\"layerFolderId\":$LID}" | python3 -m json.tool

echo -e "\n=========================================="
echo "8. GET /projects/layers/:id/objects — Layer objects"
echo "=========================================="
curl -s $BASE/projects/layers/$LID/objects -H "$H" | python3 -m json.tool

echo -e "\n=========================================="
echo "9. POST /projects/land-plots — Create land plot"
echo "=========================================="
curl -s -X POST $BASE/projects/land-plots -H "Content-Type: application/json" -H "$H" -d '{"cadastral_number":"TEST:01:001:1","area":1000,"address":"Test address","polygon_id":25}' | python3 -m json.tool

echo -e "\n=========================================="
echo "10. PUT /projects/land-plots/:id — Update land plot"
echo "=========================================="
LPID=$(curl -s -X POST $BASE/projects/land-plots -H "Content-Type: application/json" -H "$H" -d '{"cadastral_number":"TEST:01:001:2","area":2000,"address":"Addr"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
curl -s -X PUT $BASE/projects/land-plots/$LPID -H "Content-Type: application/json" -H "$H" -d '{"address":"Updated address","area":2500}' | python3 -m json.tool

echo -e "\n=========================================="
echo "11. POST /projects/:id/comments — Create comment"
echo "=========================================="
curl -s -X POST $BASE/projects/$PID/comments -H "Content-Type: application/json" -H "$H" -d '{"lat":55.7558,"lng":37.6173,"text":"Test comment","status":"open"}' | python3 -m json.tool

echo -e "\n=========================================="
echo "12. PUT /projects/comments/:id — Update comment"
echo "=========================================="
CID=$(curl -s -X POST $BASE/projects/$PID/comments -H "Content-Type: application/json" -H "$H" -d '{"lat":55.75,"lng":37.61,"text":"Comment","status":"open"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
curl -s -X PUT $BASE/projects/comments/$CID -H "Content-Type: application/json" -H "$H" -d '{"text":"Updated comment","status":"resolved"}' | python3 -m json.tool

echo -e "\n=========================================="
echo "13. POST /projects/:id/events — Create event with location"
echo "=========================================="
curl -s -X POST $BASE/projects/$PID/events -H "Content-Type: application/json" -H "$H" -d '{"type":"meeting","title":"Test Event","description":"Description","goal":"Test goal","eventDate":"2025-06-15","eventTime":"14:30","locationName":"Office","locationLat":55.75,"locationLng":37.61,"locationAddress":"Test address","dueDate":"2025-06-15T14:30:00Z"}' | python3 -m json.tool

echo -e "\n=========================================="
echo "14. PUT /projects/events/:id — Update event"
echo "=========================================="
EID=$(curl -s -X POST $BASE/projects/$PID/events -H "Content-Type: application/json" -H "$H" -d '{"type":"meeting","title":"Event","description":"D","goal":"G","eventDate":"2025-06-15","eventTime":"14:30","locationName":"Loc","locationLat":55.75,"locationLng":37.61,"locationAddress":"Addr","dueDate":"2025-06-15T14:30:00Z"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
curl -s -X PUT $BASE/projects/events/$EID -H "Content-Type: application/json" -H "$H" -d '{"title":"Updated Event","isDone":true}' | python3 -m json.tool

echo -e "\n=========================================="
echo "15. POST /projects/:id/folders — Create folder"
echo "=========================================="
curl -s -X POST $BASE/projects/$PID/folders -H "Content-Type: application/json" -H "$H" -d '{"type":"folder","name":"Test Folder","parentId":null}' | python3 -m json.tool

echo -e "\n=========================================="
echo "16. POST /projects/:id/folders — Create subfolder"
echo "=========================================="
FFID=$(curl -s -X POST $BASE/projects/$PID/folders -H "Content-Type: application/json" -H "$H" -d '{"type":"folder","name":"Parent Folder","parentId":null}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
curl -s -X POST $BASE/projects/$PID/folders -H "Content-Type: application/json" -H "$H" -d "{\"type\":\"folder\",\"name\":\"Sub Folder\",\"parentId\":$FFID}" | python3 -m json.tool

echo -e "\n=========================================="
echo "17. GET /projects/nspd/layers — NSPD layers"
echo "=========================================="
curl -s $BASE/projects/nspd/layers -H "$H" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(f"Total: {len(d)} NSPD layers");[print(f"  - id={l[\"id\"]} name={l[\"name\"]} enabled={l[\"enabled\"]}") for l in d[:5]]'

echo -e "\n=========================================="
echo "18. GET /projects/nspd/map/url — Map URL"
echo "=========================================="
curl -s "$BASE/projects/nspd/map/url?layerId=1&minLng=37&minLat=55&maxLng=38&maxLat=56" -H "$H" | python3 -m json.tool

echo -e "\n=========================================="
echo "19. GET /projects/polygons/search/nearest — Nearest polygons"
echo "=========================================="
curl -s "$BASE/projects/polygons/search/nearest?lat=55.75&lon=37.61&limit=5" -H "$H" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(f"Found: {len(d)} polygons");[print(f"  - id={p[\"id\"]} name={p[\"name\"]}") for p in d[:5]]'

echo -e "\n=========================================="
echo "20. POST /projects/polygons/search/intersections — Check intersections"
echo "=========================================="
curl -s -X POST $BASE/projects/polygons/search/intersections -H "Content-Type: application/json" -H "$H" -d '{"coordinates":{"type":"Polygon","coordinates":[[[37.6,55.7],[37.61,55.7],[37.61,55.71],[37.6,55.71],[37.6,55.7]]]}}' | python3 -m json.tool

echo -e "\n=========================================="
echo "21. GET /projects/nspd/cache/stats — Cache stats"
echo "=========================================="
curl -s $BASE/projects/nspd/cache/stats -H "$H" | python3 -m json.tool

echo -e "\n=========================================="
echo "22. POST /projects/:id/members — Add member"
echo "=========================================="
curl -s -X POST $BASE/projects/$PID/members -H "Content-Type: application/json" -H "$H" -d '{"userId":2,"role":"editor"}' | python3 -m json.tool

echo -e "\n=========================================="
echo "23. GET /projects/:id/members — List members"
echo "=========================================="
curl -s $BASE/projects/$PID/members -H "$H" | python3 -m json.tool

echo -e "\n=========================================="
echo "24. POST /projects/:id/map-views — Create map view"
echo "=========================================="
curl -s -X POST $BASE/projects/$PID/map-views -H "Content-Type: application/json" -H "$H" -d '{"lat":55.75,"lon":37.61,"zoom":12}' | python3 -m json.tool

echo -e "\n=========================================="
echo "25. GET /projects/:id/map-views — List map views"
echo "=========================================="
curl -s $BASE/projects/$PID/map-views -H "$H" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(f"Total: {len(d)} map views");[print(f"  - id={m[\"id\"]} lat={m[\"lat\"]} lon={m[\"lon\"]} zoom={m[\"zoom\"]}") for m in d[:5]]'

echo -e "\n=========================================="
echo "26. DELETE /projects/:id — Delete project"
echo "=========================================="
curl -s -X DELETE $BASE/projects/$PID -H "$H" | python3 -m json.tool

echo -e "\n========== ALL DONE =========="
