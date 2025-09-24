S C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\datec\backend> npm init -y
Wrote to C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\datec\backend\package.json:

{
  "name": "backend",
  "version": "1.0.0",
  "description": "",
  "main": "server.js",
  "scripts": {
PS C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\datec\backend> npm install express jsonwebtoken bcryptjs multer joi cors dotenv

added 110 packages, and audited 111 packages in 8s

18 packages are looking for funding
  run `npm fund` for details

PS C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\datec\backend> npm install mongodb redis neo4j-driver nano

added 28 packages, and audited 139 packages in 12s

21 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
PS C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\datec\backend> npm install --save-dev nodemon

added 27 packages, and audited 166 packages in 3s

25 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
PS C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\datec\backend> cd C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\database\datec-db
PS C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\database\datec-db> docker-compose ps
NAME                    IMAGE            COMMAND                  SERVICE           CREATED      STATUS                    PORTS
datec-mongo-primary     mongo:8.0        "docker-entrypoint.s…"   mongo-primary     2 days ago   Up 14 minutes (healthy)   0.0.0.0:27017->27017/tcp, [::]:27017->27017/tcp
datec-mongo-secondary   mongo:8.0        "docker-entrypoint.s…"   mongo-secondary   2 days ago   Up 14 minutes (healthy)   0.0.0.0:27018->27017/tcp, [::]:27018->27017/tcp
datec-redis-primary     redis:8-alpine   "docker-entrypoint.s…"   redis-primary     2 days ago   Up 14 minutes (healthy)   0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp
datec-redis-replica     redis:8-alpine   "docker-entrypoint.s…"   redis-replica     2 days ago   Up 14 minutes (healthy)   0.0.0.0:6380->6379/tcp, [::]:6380->6379/tcp
PS C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\database\datec-db> cd C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\datec\backend
PS C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\datec\backend> npm run dev

> backend@1.0.0 dev
> nodemon server.js

[nodemon] 3.1.10
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,mjs,cjs,json
[nodemon] starting `node server.js`
[dotenv@17.2.3] injecting env (10) from .env -- tip: ⚙️  override existing env vars with { override: true }
Connecting to databases...

Connected to MongoDB replica set: datecRS
Connected to Redis primary and replica
Connected to Neo4j database: datec
Connected to CouchDB database: datec

All databases connected successfully

Server running on http://localhost:3000
Health check: http://localhost:3000/api/health
Environment: development