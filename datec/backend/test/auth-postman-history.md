# T1 : Registro de usuario SIN avatar

## Request

```
POST http://localhost:3000/api/auth/register
Content-Type: application/json
```

## Body (raw JSON)

```json
{
  "username": "dhodgkin",
  "email_address": "dhodgkin@datec.com",
  "password": "dhodgkin",
  "full_name": "Dorothy Crowfoot Hodgkin",
  "birth_date": "2010-05-12"
}
```

## Response [200]

```
{
    "success": true,
    "message": "User registered successfully",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3OGJmZmU1MS1hMjhiLTU5OGEtODg1ZC0wZTFiMDRmYzMzMjUiLCJ1c2VybmFtZSI6ImRob2Rna2luIiwiaXNBZG1pbiI6ZmFsc2UsImlhdCI6MTc1OTYyNzAxMywiZXhwIjoxNzYwMjMxODEzfQ.eHg8Eoh-u786RVmQgmiCVgrgNgKCMcx8VaLPdNdRlDI",
    "user": {
        "userId": "78bffe51-a28b-598a-885d-0e1b04fc3325",
        "username": "dhodgkin",
        "fullName": "Dorothy Crowfoot Hodgkin",
        "isAdmin": false
    }
}
```

# T2 : Registro con avatar

## Request

```
POST http://localhost:3000/api/auth/register
Content-Type: multipart/form-data
```

## Body (form-data)

username:einst3in
email_address:einst3in@datec.com
password:einst3in
full_name:Albert Einstein
birth_date:1979-03-14
avatar:C:\Users\velysian\Documents\GitHub\DaTEC-Sharing-Site\database\multimedia\avatar\avatar_einst3in.jpg

## Response [201]

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiNDJiYzE0Ni1lZDU1LTVjNTMtYTI4NC0yYjM5ZDA3NDI3NGUiLCJ1c2VybmFtZSI6ImVpbnN0M2luIiwiaXNBZG1pbiI6ZmFsc2UsImlhdCI6MTc1OTYyNzExMiwiZXhwIjoxNzYwMjMxOTEyfQ.0aPVOan_dXZlkBVldKj7xfEoQDZvorY4Ih94Ic8U2L8",
  "user": {
    "userId": "b42bc146-ed55-5c53-a284-2b39d074274e",
    "username": "einst3in",
    "fullName": "Albert Einstein",
    "isAdmin": false
  }
}
```

# T3 Login

## Request

```
POST http://localhost:3000/api/auth/login
Content-Type: application/json
```

## Body (raw JSON)

```json
{
  "username": "dhodgkin",
  "password": "dhodgkin"
}
```

## Response [200]

```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3OGJmZmU1MS1hMjhiLTU5OGEtODg1ZC0wZTFiMDRmYzMzMjUiLCJ1c2VybmFtZSI6ImRob2Rna2luIiwiaXNBZG1pbiI6ZmFsc2UsImlhdCI6MTc1OTYyNzE0NCwiZXhwIjoxNzYwMjMxOTQ0fQ.h7GKsqT103p_N94jvHCi8xVfYXG5X9_hcKJ8ivxZifQ",
  "user": {
    "userId": "78bffe51-a28b-598a-885d-0e1b04fc3325",
    "username": "dhodgkin",
    "fullName": "Dorothy Crowfoot Hodgkin",
    "isAdmin": false,
    "avatarUrl": null
  }
}
```

# T4 LogiGet Current User (token)

## Request

```
GET http://localhost:3000/api/auth/me
Auth:
Auth Type : Bearer Token
{TOKEN_FROM_LOGIN}
```

## Body (none)

```

```

## Response [200]

```
{
    "success": true,
    "user": {
        "userId": "78bffe51-a28b-598a-885d-0e1b04fc3325",
        "username": "dhodgkin",
        "email": "dhodgkin@datec.com",
        "fullName": "Dorothy Crowfoot Hodgkin",
        "birthDate": "2010-05-12T00:00:00.000Z",
        "isAdmin": false,
        "avatarUrl": null,
        "createdAt": "2025-10-05T01:16:53.530Z"
    }
}
```

# T5 Admin Login

## Request

```
POST http://localhost:3000/api/auth/login
Content-Type: application/json
```

## Body (raw JSON)

```
{
  "username": "sudod4t3c",
  "password": "dat3c_master_4dmin"
}
```

## Response [200]

```
{
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMDAwMDAwMC0wMDAwLTUwMDAtODAwMC0wMDAwNWEzMTczNDciLCJ1c2VybmFtZSI6InN1ZG9kNHQzYyIsImlzQWRtaW4iOnRydWUsImlhdCI6MTc1OTYyNzI0NCwiZXhwIjoxNzYwMjMyMDQ0fQ.Y0wlgGcQT4x9ikXSxyRUq0Vok7UosOqpLmL3UFnZJmY",
    "user": {
        "userId": "00000000-0000-5000-8000-00005a317347",
        "username": "sudod4t3c",
        "fullName": "DaTEC System Administrator",
        "isAdmin": true,
        "avatarUrl": null
    }
}
```

# T6 : Duplicate username

## Request

```
POST http://localhost:3000/api/auth/register
Content-Type: application/json
```

## Body (raw JSON)

```json
{
  "username": "dhodgkin",
  "email_address": "abc123@datec.com",
  "password": "dhodgkin",
  "full_name": "Dorothy Crowfoot",
  "birth_date": "2010-05-12"
}
```

## Response [409]

```
{
    "success": false,
    "error": "Username already exists"
}
```

# T7 : Duplicate email

## Request

```
POST http://localhost:3000/api/auth/register
Content-Type: application/json
```

## Body (raw JSON)

```json
{
  "username": "crowfoot",
  "email_address": "dhodgkin@datec.com",
  "password": "dhodgkin",
  "full_name": "Dorothy Crowfoot",
  "birth_date": "2010-05-12"
}
```

## Response [409]

```
{
    "success": false,
    "error": "Email already exists"
}
```

# T8 : Age restriction

## Request

```
POST http://localhost:3000/api/auth/register
Content-Type: application/json
```

## Body (raw JSON)

```json
{
  "username": "younguser",
  "email_address": "younguser@datec.com",
  "password": "younguser",
  "full_name": "Young User",
  "birth_date": "2015-01-01"
}
```

## Response [400]

```
{
    "success": false,
    "error": "User must be at least 15 years old"
}
```

# T9 : Short username

## Request

```
POST http://localhost:3000/api/auth/register
Content-Type: application/json
```

## Body (raw JSON)

```json
{
  "username": "su",
  "email_address": "shortuser@datec.com",
  "password": "shortuser",
  "full_name": "Short User",
  "birth_date": "2000-01-01"
}
```

## Response [400]

```
{
    "success": false,
    "error": "Username must be at least 3 characters"
}
```

# T10 : Short password

## Request

```
POST http://localhost:3000/api/auth/register
Content-Type: application/json
```

## Body (raw JSON)

```json
{
  "username": "shortpassword",
  "email_address": "shortpassword@datec.com",
  "password": "pass",
  "full_name": "Short Password",
  "birth_date": "2000-01-01"
}
```

## Response [400]

```
{
    "success": false,
    "error": "Password must be at least 8 characters"
}
```

# T11 Invalid Login

## Request

```
POST http://localhost:3000/api/auth/login
Content-Type: application/json
```

## Body (raw JSON)

```json
{
  "username": "dhodgkin",
  "password": "wrongpass"
}
```

## Response [401]

```json
{
  "success": false,
  "error": "Invalid username or password"
}
```
