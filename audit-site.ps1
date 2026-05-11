$ErrorActionPreference = 'Continue'
$root = (Get-Location).Path
Write-Host "Auditing: $root" -ForegroundColor Cyan
$htmlFiles = Get-ChildItem -Path . -Filter *.html -Recurse | Where-Object { $_.FullName -notmatch '\\node_modules\\|\\\.git\\' }
Write-Host "Found $($htmlFiles.Count) HTML files.`n" -ForegroundColor Gray
$issues = New-Object System.Collections.ArrayList
function Add-Issue($file, $line, $kind, $detail) { [void]$issues.Add([pscustomobject]@{ File=$file; Line=$line; Kind=$kind; Detail=$detail }) }

Write-Host "[1/6] Bad characters..." -ForegroundColor Yellow
$badPatterns = @(
    @{ P='Ã[¢¤¦¨©®°±²´¶·º¼½¾]'; L='UTF8-as-Latin1' },
    @{ P='â€[™œ"˜"¦“”]';        L='Smart-quote mojibake' },
    @{ P='ÃƒÂ';                  L='Double-encoded' },
    @{ P='\uFFFD';               L='Replacement char' },
    @{ P='ΓÇ[öô"ÖÔ]';            L='CP437 mojibake' }
)
foreach ($f in $htmlFiles) {
    $n = 0
    foreach ($line in (Get-Content $f.FullName)) {
        $n++
        foreach ($p in $badPatterns) {
            if ($line -match $p.P) {
                $s = ($line.Trim() -replace '\s+',' ')
                if ($s.Length -gt 120) { $s = $s.Substring(0,120) + '…' }
                Add-Issue $f.Name $n "BadChar:$($p.L)" $s
            }
        }
    }
}

Write-Host "[2/6] Placeholders..." -ForegroundColor Yellow
$phRegex = '(?i)(lorem ipsum|TODO|TBD|FIXME|placeholder|goes here|\[INSERT|\{\{[^}]+\}\}|TKTK|COMING SOON|replace this)'
foreach ($f in $htmlFiles) {
    $n = 0
    foreach ($line in (Get-Content $f.FullName)) {
        $n++
        if ($line -match '<!--.*-->') { continue }
        if ($line -match $phRegex) {
            $s = ($line.Trim() -replace '\s+',' ')
            if ($s.Length -gt 140) { $s = $s.Substring(0,140) + '…' }
            Add-Issue $f.Name $n "Placeholder" $s
        }
    }
}

Write-Host "[3/6] Internal links..." -ForegroundColor Yellow
$existing = @{}
Get-ChildItem -Path . -Recurse -File | Where-Object { $_.FullName -notmatch '\\\.git\\|\\node_modules\\' } | ForEach-Object {
    $rel = $_.FullName.Substring($root.Length).TrimStart('\','/').Replace('\','/').ToLower()
    $existing[$rel] = $true
}
foreach ($f in $htmlFiles) {
    $n = 0
    foreach ($line in (Get-Content $f.FullName)) {
        $n++
        $matches = [regex]::Matches($line, '(?i)\b(?:href|src)\s*=\s*"([^"#?]+)(?:[?#][^"]*)?"')
        foreach ($m in $matches) {
            $t = $m.Groups[1].Value.Trim()
            if (-not $t) { continue }
            if ($t -match '^(https?:|mailto:|tel:|data:|javascript:|//|#)') { continue }
            $clean = ($t -replace '^\./','').Replace('\','/').ToLower()
            if (-not $existing.ContainsKey($clean)) { Add-Issue $f.Name $n "MissingFile" $t }
        }
    }
}

Write-Host "[4/6] Tiny media files..." -ForegroundColor Yellow
$mediaExts = @('.jpg','.jpeg','.png','.gif','.webp','.svg','.pdf','.mp4','.mov','.webm')
Get-ChildItem -Path . -Recurse -File | Where-Object { $mediaExts -contains $_.Extension.ToLower() -and $_.FullName -notmatch '\\\.git\\' } | ForEach-Object {
    if ($_.Length -lt 200) {
        $rel = $_.FullName.Substring($root.Length).TrimStart('\','/')
        Add-Issue $rel '' "TinyMedia" "$($_.Length) bytes"
    }
}

Write-Host "[5/6] External links..." -ForegroundColor Yellow
$ext = @{}
foreach ($f in $htmlFiles) {
    $n = 0
    foreach ($line in (Get-Content $f.FullName)) {
        $n++
        $matches = [regex]::Matches($line, '(?i)\bhref\s*=\s*"(https?://[^"]+)"')
        foreach ($m in $matches) {
            $u = ($m.Groups[1].Value -replace '[)\.,;]+$','')
            if (-not $ext.ContainsKey($u)) { $ext[$u] = @() }
            $ext[$u] += "$($f.Name):$n"
        }
    }
}
Write-Host "  Testing $($ext.Keys.Count) URLs..." -ForegroundColor Gray
$i = 0
foreach ($u in $ext.Keys) {
    $i++
    Write-Progress -Activity "External" -Status $u -PercentComplete (($i/$ext.Keys.Count)*100)
    $bad = $null
    try {
        $r = Invoke-WebRequest -Uri $u -Method Head -TimeoutSec 8 -UseBasicParsing -MaximumRedirection 5 -ErrorAction Stop
        if ([int]$r.StatusCode -ge 400) { $bad = "HTTP $([int]$r.StatusCode)" }
    } catch {
        try {
            $r = Invoke-WebRequest -Uri $u -Method Get -TimeoutSec 8 -UseBasicParsing -MaximumRedirection 5 -ErrorAction Stop
            if ([int]$r.StatusCode -ge 400) { $bad = "HTTP $([int]$r.StatusCode)" }
        } catch {
            $msg = $_.Exception.Message
            if ($msg.Length -gt 60) { $msg = $msg.Substring(0,60) + '…' }
            $bad = $msg
        }
    }
    if ($bad) {
        foreach ($loc in $ext[$u]) {
            $p = $loc -split ':',2
            Add-Issue $p[0] $p[1] "ExtLink" "$u — $bad"
        }
    }
}
Write-Progress -Activity "External" -Completed

Write-Host "[6/6] Markup sanity..." -ForegroundColor Yellow
foreach ($f in $htmlFiles) {
    $c = Get-Content $f.FullName -Raw
    foreach ($m in [regex]::Matches($c, '(?i)<img\b(?![^>]*\balt\s*=)[^>]*>')) {
        $s = $m.Value; if ($s.Length -gt 100) { $s = $s.Substring(0,100) + '…' }
        Add-Issue $f.Name '' "Img:NoAlt" $s
    }
    foreach ($m in [regex]::Matches($c, '\$\{[A-Z_]+\}')) { Add-Issue $f.Name '' "UnresolvedToken" $m.Value }
}

Write-Host "`n================ AUDIT REPORT ================" -ForegroundColor Cyan
if ($issues.Count -eq 0) {
    Write-Host "Clean. Zero issues found." -ForegroundColor Green
} else {
    Write-Host "Total: $($issues.Count)" -ForegroundColor Yellow
    Write-Host "`nBy category:" -ForegroundColor Gray
    $issues | Group-Object Kind | Sort-Object Count -Descending | ForEach-Object { Write-Host ("  {0,-30} {1}" -f $_.Name, $_.Count) }
    $csv = Join-Path $root 'audit-report.csv'
    $issues | Export-Csv -Path $csv -NoTypeInformation -Encoding UTF8
    Write-Host "`nFull detail: $csv" -ForegroundColor Cyan
}
Write-Host "`nDone." -ForegroundColor Green
