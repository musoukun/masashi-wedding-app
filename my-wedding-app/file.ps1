$files = Get-ChildItem -Recurse -Filter *.ts* | Where-Object { $_.Extension -match '\.tsx?$' }
$output = ""

foreach ($file in $files) {
   $output += "// $($file.Name)`n"
   $output += Get-Content $file.FullName -Raw
   $output += "`n`n"
}

$output | Out-File "combined_typescript.ts"