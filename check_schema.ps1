$headers = @{
  apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNobHBxcHNjbXZkeGt4cXVxaWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDg3NTIsImV4cCI6MjA5NTMyNDc1Mn0.Ba1SgbYw6ZRDFMKib7s8MLCey2IMJc17TQ0zzO8RA60"
}
$apps = Invoke-RestMethod "https://shlpqpscmvdxkxquqibb.supabase.co/rest/v1/apps?select=id,taskid,userid,username,tasktitle,status,appliedat,checked_in_at,completed_at,salary_apply_note,confirmed_salary,confirmed_points,checked_in_at,completed_at&order=id.desc&limit=5" -Headers $headers
$apps | ConvertTo-Json -Depth 5

Write-Host "---activities fields---"
$acts = Invoke-RestMethod "https://shlpqpscmvdxkxquqibb.supabase.co/rest/v1/activities?select=id,title,date,time_slots,start_date,end_date,time,require_checkin&limit=3" -Headers $headers
$acts | ConvertTo-Json -Depth 5

Write-Host "---users fields---"
$users = Invoke-RestMethod "https://shlpqpscmvdxkxquqibb.supabase.co/rest/v1/users?select=id,name,total_points,total_salary,completed_count,joined_at&limit=3" -Headers $headers
$users | ConvertTo-Json -Depth 5

Write-Host "---rewards check---"
$rewards = Invoke-RestMethod "https://shlpqpscmvdxkxquqibb.supabase.co/rest/v1/rewards?limit=1" -Headers $headers
$rewards | ConvertTo-Json -Depth 5