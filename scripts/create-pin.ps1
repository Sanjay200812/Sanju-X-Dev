$studioCode = Read-Host 'Choose the private secondary code' -AsSecureString
$studioPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($studioCode)
try {
  $studioPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($studioPointer)
  $studioPlain | node scripts/pin.mjs
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($studioPointer)
  $studioPlain = $null
}
