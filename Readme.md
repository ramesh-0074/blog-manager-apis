# Authentication API

## Create First Admin

This endpoint is used to **create the very first admin** in the system.  
It should only be called once during initial setup.

### Endpoint

### Payload
```json
{
  "adminKey": "firstAdmin",
  "name": "Admin",
  "email": "youremail@gmail.com",
  "password": "password@1234"
}

curl -X POST http://localhost:5000/api/auth/create-first-admin \
  -H "Content-Type: application/json" \
  -d '{
    "adminKey": "firstAdmin",
    "name": "Admin",
    "email": "youremail@gmail.com",
    "password": "password@1234"
  }'
