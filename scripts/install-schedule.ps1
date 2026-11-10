param([switch]$Remove)
$ErrorActionPreference = 'Stop'
$taskName = 'BodyForgeReels-Daily'
if ($Remove) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host 'Đã gỡ lịch BodyForgeReels.'
    exit
}
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$zone = Get-TimeZone
if ($zone.BaseUtcOffset.TotalHours -ne 7 -or $zone.SupportsDaylightSavingTime) {
    throw 'Lịch này yêu cầu Windows ở múi giờ UTC+07 không DST (SE Asia Standard Time). Hãy đổi múi giờ hoặc tạo lịch tương đương 05:00 UTC.'
}
# Auto/Edge voice can run without .env. Azure configuration is validated by the renderer.
$nodeExe = (Get-Command node -ErrorAction Stop).Source
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument ('"' + (Join-Path $projectRoot 'scripts\cli.mjs') + '" daily') -WorkingDirectory $projectRoot
$config = Get-Content -LiteralPath (Join-Path $projectRoot 'config.json') -Raw | ConvertFrom-Json
$trigger = New-ScheduledTaskTrigger -Daily -At $config.dailyTime
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -MultipleInstances IgnoreNew -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 15) -ExecutionTimeLimit (New-TimeSpan -Hours 3)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Tạo 1 video tập luyện mỗi ngày lúc 12:00 giờ Việt Nam; không tự đăng Facebook.' -Force | Out-Null
Write-Host 'Đã tạo lịch. Máy cần có điện, kết nối mạng và người dùng đăng nhập. Xem kết quả trong renders/YYYY-MM-DD.'
