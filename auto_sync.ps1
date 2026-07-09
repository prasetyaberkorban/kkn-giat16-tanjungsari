$folder = "C:\Users\firza\Documents\KKNGIAT16TJ"
$git = "C:\Program Files\Git\cmd\git.exe"

Set-Location $folder

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Auto-Sync GitHub sedang berjalan..." -ForegroundColor Green
Write-Host " Setiap Anda menyimpan file, perubahan akan otomatis di-upload ke GitHub." -ForegroundColor Green
Write-Host " Biarkan jendela ini tetap terbuka. Tekan Ctrl+C untuk berhenti." -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

while ($true) {
    Start-Sleep -Seconds 10
    
    # Periksa apakah ada perubahan file
    $status = & $git status --porcelain
    if ($status) {
        $time = Get-Date -Format "HH:mm:ss"
        Write-Host "[$time] Perubahan terdeteksi. Melakukan sinkronisasi..." -ForegroundColor Yellow
        
        & $git add .
        $date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        & $git commit -m "Auto commit pada $date"
        
        Write-Host "[$time] Mengambil pembaruan terbaru dari GitHub..." -ForegroundColor DarkGray
        & $git pull --rebase
        
        Write-Host "[$time] Mengunggah perubahan ke GitHub..." -ForegroundColor DarkGray
        & $git push
        
        Write-Host "[$time] Sinkronisasi selesai. Perubahan telah di-push!" -ForegroundColor Green
    }
}
