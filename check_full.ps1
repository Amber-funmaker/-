$headers = @{
  apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNobHBxcHNjbXZkeGt4cXVxaWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDg3NTIsImV4cCI6MjA5NTMyNDc1Mn0.Ba1SgbYw6ZRDFMKib7s8MLCey2IMJc17TQ0zzO8RA60"
}

Write-Host "=== ACTIVITIES ==="
$acts = Invoke-RestMethod "https://shlpqpscmvdxkxquqibb.supabase.co/rest/v1/activities?limit=2&order=id.desc" -Headers $headers
$acts | ConvertTo-Json -Depth 6

Write-Host "=== USERS ==="
$users = Invoke-RestMethod "https://shlpqpscmvdxkxquqibb.supabase.co/rest/v1/users?limit=2&order=id.desc" -Headers $headers
$users | ConvertTo-Json -Depth 6

Write-Host "=== APPS ==="
$apps = Invoke-RestMethod "https://shlpqpscmvdxkxquqibb.supabase.co/rest/v1/apps?limit=3&order=id.desc" -Headers $headers
$apps | ConvertTo-Json -Depth 6

Write-Host "=== ADMIN ==="
$admin = Invoke-RestMethod "https://shlpqpscmvdxkxquqibb.supabase.co/rest/v1/admin?limit=2" -Headers $headers
$admin | ConvertTo-Json -Depth 6