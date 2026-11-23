# Web List SN & Mitra (Scanner FTTH Modern - REV 4.0)

Aplikasi web pemindai Serial Number (SN) perangkat FTTH (ONT dan Kabel Dropwire Precon) dengan kamera live, filter cerdas multi-barcode, isolasi GPON SN ketat, dan sinkronisasi ke Google Spreadsheet.

---

## 📸 Logika Scan Kamera Khusus ONT & Precon (Sesuai Fisik Label Dus)

Di lapangan, dus ONT memiliki **banyak barcode berdekatan**. Sistem versi 4.0 dirancang dengan **filter ketat** agar kamera **hanya menerima barcode yang benar**:

### 1. FIBER HOME, RAISECOM, ZTE ➔ Wajib Barcode bertuliskan "GPON SN"
- **ZTE (ZXHN F679D)**:
  - Di label ada: `EN: EQUGT...`, `GPON SN: ZTEG...`, dan `MAC: ...`
  - Scanner hanya mengunci barcode bertuliskan **`GPON SN`** (Prefix **`ZTEG`**).
  - Barcode `EN:` dan `MAC:` otomatis diabaikan.
- **RAISECOM (ISCOM HT803G)**:
  - Di label ada: `SN: 1650030...` (SN Pabrik), `GPON SN: RCMG...`, dan `MAC: ...`
  - **KHUSUS RAISECOM**: Barcode `SN: 165003...` **DIABAIKAN**. Scanner hanya mengunci barcode bertuliskan **`GPON SN`** (Prefix **`RCMG`**).
- **FIBER HOME (HG6045D1)**:
  - Di label ada: Barcode 1D dan QR Code 2D bertuliskan **`GPON SN`** (Prefix **`FHTT`**).
  - Scanner mendukung keduanya secara bersamaan. Barcode model `2094480...` dan MAC otomatis diabaikan.

### 2. HUAWEI ➔ Khusus Barcode bertuliskan "SN"
- Pada dus ONT Huawei, tidak ada tulisan "GPON SN", melainkan barcode bertuliskan **`SN:`** (Pola hex 16 digit yang diawali **`48575443`** atau **`HWTC`**).
- Barcode Prod ID (`215008...`) dan MAC (`B46142...`) otomatis diabaikan.

### 3. KABEL DROPWIRE PRECON
- Barcode dengan kode panjang:
  - **Precon 150**: Mengandung prefix `860250` (termasuk awalan fisik `00860250...`)
  - **precon 100**: Mengandung prefix `853360` (diselaraskan ke huruf kecil `precon 100` sesuai sheet)
  - **Precon 250**: Mengandung prefix `MDTDW250`
  - **Precon 50**: Mengandung prefix `846370`

### 4. Pencegahan Error Barcode Acak:
- Jika kamera mengenai barcode yang bukan target di atas (misal barcode stiker gudang, kode kardus, atau MAC address), scanner **TIDAK AKAN memasukkan data salah** dan **TIDAK AKAN error**.
- Kamera akan terus aktif mencari barcode GPON SN / SN Huawei yang tepat sambil menampilkan panduan di layar.

---

## ⚡ Fitur Baru Kamera di Web:
1. **Lampu Senter (Torch)**: Tombol *Senter* di atas kamera untuk memindai barcode di tempat minim cahaya.
2. **Kamera High Resolution & Continuous Focus**: Mengatur fokus otomatis lensa agar garis tipis barcode Code 128 terbaca seketika.
3. **Pilihan Dropdown 100% Identik Sheet**: Opsi Merk (Baru/Bekas) dan 31 Mitra disesuaikan penuh dengan aturan validasi Google Sheet.
