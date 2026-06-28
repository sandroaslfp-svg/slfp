# Script de mise à jour automatique SLFP
# Surveille le dossier et envoie les modifications sur Netlify

$SiteId = "mellow-jelly-ba7bd6"
$Folder = "C:\Users\sandroa\OneDrive - Tibi\Gallerie\opencode\SLFP fiches"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SLFP - Mise à jour automatique" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dossier surveillé : $Folder" -ForegroundColor Yellow
Write-Host "Site Netlify : https://$SiteId.netlify.app" -ForegroundColor Green
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Gray
Write-Host ""

# Créer le watcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $Folder
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Fonction de déploiement
function Deploy-ToNetlify {
    Write-Host ""
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Changement détecté !" -ForegroundColor Yellow
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Préparation du déploiement..." -ForegroundColor Cyan
    
    try {
        # Créer un fichier ZIP temporaire
        $zipPath = "$env:TEMP\slfp-deploy.zip"
        if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
        
        # Compresser le dossier
        Compress-Archive -Path "$Folder\*" -DestinationPath $zipPath -Force
        
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Envoi vers Netlify..." -ForegroundColor Cyan
        
        # Envoyer vers Netlify
        $headers = @{
            "Content-Type" = "application/zip"
        }
        
        $response = Invoke-RestMethod -Uri "https://api.netlify.com/api/v1/sites/$SiteId/deploys" `
            -Method Post `
            -Headers $headers `
            -InFile $zipPath `
            -ErrorAction Stop
        
        # Supprimer le ZIP temporaire
        Remove-Item $zipPath -Force
        
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✅ Site mis à jour !" -ForegroundColor Green
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] https://$SiteId.netlify.app" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ❌ Erreur : $_" -ForegroundColor Red
    }
}

# Événements
Register-ObjectEvent $watcher "Created" -Action { Deploy-ToNetlify }
Register-ObjectEvent $watcher "Changed" -Action { Deploy-ToNetlify }
Register-ObjectEvent $watcher "Deleted" -Action { Deploy-ToNetlify }
Register-ObjectEvent $watcher "Renamed" -Action { Deploy-ToNetlify }

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Surveillance active..." -ForegroundColor Green
Write-Host ""

# Attendre indéfiniment
while ($true) { Start-Sleep -Seconds 1 }
