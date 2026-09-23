# Official Architecture & Security Specification Reference
**Document Category**: Verified Official Documentation & Security Standards
**Scope**: Windows Hello Biometrics, TPM 2.0 CNG Key Storage, BIP-39 Encrypted Export (`.eriskey`), and Windows Job Object Process Isolation.

---

## 1. Tauri v2 Desktop Biometrics: Windows Hello (`tauri-plugin-biometry`)

### 1.1 Plugin Architecture
While `@tauri-apps/plugin-biometric` is mobile-only (iOS/Android), desktop Windows Hello authentication is officially supported via the community-standard `tauri-plugin-biometry` (by `choochmeque`).

- **Crate**: `tauri-plugin-biometry = "0.2"`
- **NPM Package**: `@choochmeque/tauri-plugin-biometry-api`
- **Native Hook**: Interfaces with Windows `Windows.Security.Credentials.UI.UserConsentVerifier` WinRT API.

### 1.2 Registration & Usage
```rust
// src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_biometry::init())
        .run(tauri::generate_context!())
        .expect("error while running ERIS application");
}
```

```typescript
// frontend/src/services/biometry.ts
import { authenticate, checkStatus } from '@choochmeque/tauri-plugin-biometry-api';

export async function verifyWindowsHello(): Promise<boolean> {
  const status = await checkStatus();
  if (!status.isAvailable) {
    return false;
  }
  const result = await authenticate({
    reason: 'Verify your identity to unlock ERIS Master Vault',
    fallbackTitle: 'Use Master Password',
  });
  return result.success;
}
```

---

## 2. Hardware-Rooted TPM 2.0 Binding via Windows CNG (Pre-Production Requirement)

### 2.1 Microsoft Platform Crypto Provider
To cryptographically bind ERIS to Aman Sinha's specific physical hardware, Windows Cryptography API: Next Generation (CNG) is used targeting `MS_PLATFORM_CRYPTO_PROVIDER`.

- **Provider**: `"Microsoft Platform Crypto Provider"`
- **Hardware Requirement**: TPM 2.0 (Trusted Platform Module) chip enabled in UEFI/BIOS.
- **Security Invariant**: The private key is generated inside the TPM hardware and is **non-exportable** (`NCRYPT_EXPORT_POLICY_PROPERTY` set to `0`). Even if a malicious actor copies the entire ERIS filesystem, database, and registry keys to another machine, the TPM challenge will fail because the private key cannot physically leave the original TPM silicon.

### 2.2 Rust Implementation Pattern (`windows` crate)
```rust
use windows::core::PCWSTR;
use windows::Win32::Security::Cryptography::{
    NCryptOpenStorageProvider, NCryptCreatePersistedKey, NCryptFinalizeKey,
    NCryptSignHash, NCryptFreeObject, MS_PLATFORM_CRYPTO_PROVIDER,
    NCRYPT_PROV_HANDLE, NCRYPT_KEY_HANDLE, BCRYPT_PAD_PKCS1,
};

pub struct TpmDeviceBinding {
    prov_handle: NCRYPT_PROV_HANDLE,
    key_handle: NCRYPT_KEY_HANDLE,
}

impl TpmDeviceBinding {
    pub fn init_or_load(key_name: &str) -> Result<Self, String> {
        let mut prov = NCRYPT_PROV_HANDLE::default();
        unsafe {
            NCryptOpenStorageProvider(
                &mut prov,
                PCWSTR(MS_PLATFORM_CRYPTO_PROVIDER.as_ptr()),
                0,
            ).map_err(|e| format!("TPM 2.0 unavailable: {}", e))?;
            
            // Create or open hardware-sealed ECDSA/RSA key
            // Keys persist inside the Windows TPM Key Container
        }
        Ok(Self { prov_handle: prov, key_handle: NCRYPT_KEY_HANDLE::default() })
    }
}
```

---

## 3. BIP-39 Mnemonic + Encrypted Keystore Export (`.eriskey`)

### 3.1 Dual-Tier Recovery Architecture
Per user directive, ERIS provides:
1. **On-Screen Display**: BIP-39 12-word recovery mnemonic (displayed once with a copy button and acknowledgement checkbox).
2. **Encrypted File Export (`.eriskey`)**: An encrypted JSON envelope exported to a physical storage drive selected via Tauri's native file save dialog (`@tauri-apps/plugin-dialog`).

### 3.2 `.eriskey` Specification
- **Cipher**: AES-256-GCM (Galois/Counter Mode) with authenticated encryption.
- **Key Derivation Function (KDF)**: Argon2id (`m=65536, t=3, p=4`, 32-byte salt).
- **Format**:
```json
{
  "version": "1.0",
  "kdf": "argon2id",
  "kdf_params": {
    "memory_cost": 65536,
    "time_cost": 3,
    "parallelism": 4,
    "salt_b64": "<base64-salt>"
  },
  "cipher": "aes-256-gcm",
  "nonce_b64": "<12-byte-base64-nonce>",
  "ciphertext_b64": "<base64-encrypted-payload>",
  "tag_b64": "<16-byte-auth-tag>",
  "metadata": {
    "developer_name": "Aman Sinha",
    "created_at": "2026-09-14T15:30:00Z",
    "fingerprint": "<sha256-public-key-hash>"
  }
}
```
- **Payload Contents (Encrypted)**:
  - 12-word BIP-39 mnemonic phrase.
  - Root master seed.
  - Device ID registration certificate.

---

## 4. Windows Job Object Process Isolation (0-Orphan Process Guarantee)

### 4.1 Threat & Failure Mode
When ERIS runs child processes (Python FastAPI backend, xterm PTY shells, data parsers), a sudden crash, hard exit, or user kill could leave orphan background processes consuming CPU, GPU, and locking database files (`duckdb.db`, `sqlite_vec.db`).

### 4.2 Win32 Job Object Mitigation
Windows Job Objects with the `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` flag ensure that when the parent Tauri process terminates (even via `Task Manager -> End Task`), the Windows kernel automatically terminates all child and grandchild processes instantly.

```rust
use windows::Win32::System::JobObjects::{
    CreateJobObjectW, SetInformationJobObject, AssignProcessToJobObject,
    JobObjectExtendedLimitInformation, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
    JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
};

pub fn bind_child_to_job(child_handle: HANDLE) -> Result<(), String> {
    unsafe {
        let job = CreateJobObjectW(None, None).map_err(|e| e.to_string())?;
        let mut info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        
        SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            &info as *const _ as *const _,
            std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
        ).map_err(|e| e.to_string())?;

        AssignProcessToJobObject(job, child_handle).map_err(|e| e.to_string())?;
    }
    Ok(())
}
```
