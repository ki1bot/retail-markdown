# Retail Markdown Price Optimization

Prototipe dashboard untuk menganalisis penjualan pakaian dan membandingkan
skenario diskon dinamis selama empat minggu. Proyek memakai React/Vite pada
frontend, Django REST Framework pada backend, dan PostgreSQL untuk menyimpan
observasi serta riwayat simulasi.

## Dataset yang didukung

- `sales_data.csv` — berisi penjualan aktual dan kolom `Demand`.
- `retail_store_inventory.csv` — berisi persediaan dan kolom `Demand Forecast`.

Aplikasi hanya mengimpor kategori `Clothing` dari kedua file tersebut. File
`Retail and wherehouse Sale.csv` tidak sesuai: isinya penjualan ritel/gudang
minuman dan perlengkapan, tanpa data harga maupun diskon.

## Menjalankan aplikasi

1. Salin `.env.example` menjadi `.env`, lalu isi secret Django dan kredensial
   PostgreSQL.
2. Jalankan `docker compose up --build` dari direktori proyek.
3. Buka `http://localhost:8080`, masuk ke **Data**, lalu unggah salah satu CSV
   yang didukung.