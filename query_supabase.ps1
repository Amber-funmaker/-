$headers = @{
  apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNobHBxcHNjbXZkeGt4cXVxaWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDg3NTIsImV4cCI6MjA5NTMyNDc1Mn0.Ba1SgbYw6ZRDFMKib7s8MLCey2IMJc17TQ0zzO8RA60"
}
$acts = Invoke-RestMethod "https://shlpqpscmvdxkxquqibb.supabase.co/rest/v1/activities?select=id,title,status&order=id.desc&limit=5" -Headers $headers -ErrorAction Continue
if ($acts) { $acts | ConvertTo-Json -Depth 4 } else { Write-Host "[empty or error]" }