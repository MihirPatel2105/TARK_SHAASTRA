
# This simulates what happens when:
# 1. User logs in successfully with real backend
# 2. Browser saves token+user
# 3. Browser reloads page
# 4. localStorage has user and old token

# Get a real token
\@{message=Login successful; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZTNhYjRjZWZmOTZhYjA4ODMzNjg1MCIsImlhdCI6MTc3NjUzOTQ4NSwiZXhwIjoxNzc3MTQ0Mjg1fQ.r0D_wLEeiz46BYb-aluPl9Aj-CfO7-WfiR5byJ76GJw; user=} = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/auth/login -ContentType "application/json" -Body "{"email":"citizen.demo@vgs.gov.in","password":"Citizen@123"}" 
\eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZTNhYjRjZWZmOTZhYjA4ODMzNjg1MCIsImlhdCI6MTc3NjUzOTQ4NSwiZXhwIjoxNzc3MTQ0Mjg1fQ.r0D_wLEeiz46BYb-aluPl9Aj-CfO7-WfiR5byJ76GJw = \@{message=Login successful; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZTNhYjRjZWZmOTZhYjA4ODMzNjg1MCIsImlhdCI6MTc3NjUzOTQ4NSwiZXhwIjoxNzc3MTQ0Mjg1fQ.r0D_wLEeiz46BYb-aluPl9Aj-CfO7-WfiR5byJ76GJw; user=}.token
\ = \@{message=Login successful; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZTNhYjRjZWZmOTZhYjA4ODMzNjg1MCIsImlhdCI6MTc3NjUzOTQ4NSwiZXhwIjoxNzc3MTQ0Mjg1fQ.r0D_wLEeiz46BYb-aluPl9Aj-CfO7-WfiR5byJ76GJw; user=}.user.id
Write-Host "Logged in successfully"
Write-Host "Token: \eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZTNhYjRjZWZmOTZhYjA4ODMzNjg1MCIsImlhdCI6MTc3NjUzOTQ4NSwiZXhwIjoxNzc3MTQ0Mjg1fQ.r0D_wLEeiz46BYb-aluPl9Aj-CfO7-WfiR5byJ76GJw"
Write-Host "User ID: \"

# Now test that request with this token succeeds
\ = Invoke-RestMethod -Method Get -Uri http://localhost:5000/api/complaints/mine -Headers @{ Authorization = "Bearer \eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZTNhYjRjZWZmOTZhYjA4ODMzNjg1MCIsImlhdCI6MTc3NjUzOTQ4NSwiZXhwIjoxNzc3MTQ0Mjg1fQ.r0D_wLEeiz46BYb-aluPl9Aj-CfO7-WfiR5byJ76GJw" }
Write-Host "Request with Bearer token succeeded: \ complaints"

# Now test that request with just x-user-id succeeds (backend fallback)
\ = Invoke-RestMethod -Method Get -Uri http://localhost:5000/api/complaints/mine -Headers @{ "x-user-id" = \ }
Write-Host "Request with x-user-id header succeeded: \ complaints"

# Now test that request without auth fails
try {
    \ = Invoke-RestMethod -Method Get -Uri http://localhost:5000/api/complaints/mine
    Write-Host "ERROR: Request without auth should have failed!"
} catch {
    Write-Host "Request without auth failed as expected (401 Unauthorized)"
}
