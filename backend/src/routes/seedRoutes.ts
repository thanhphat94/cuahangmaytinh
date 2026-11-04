/**
 * seedRoutes.ts — Prisma + dữ liệu thật từ Thunderbit (37 PC + 60 Camera + 20 Máy in = 117 sản phẩm)
 * POST /api/seed
 */
import crypto from 'crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

/** Slug danh mục được tạo trong handler và dùng trong `PRODUCTS_DATA`. */
type SeedCategorySlug = 'may-tinh-pc' | 'camera-quan-sat' | 'may-in';

/**
 * Shape thật của một dòng trong `PRODUCTS_DATA`: cả 117 entry đều có mặt đủ 14 trường
 * (`originalPrice` có thể là `null`), nên không cần property optional.
 */
type SeedProduct = {
  catSlug: SeedCategorySlug;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  price: number;
  originalPrice: number | null;
  images: string[];
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  isNewProduct: boolean;
  shortDescription: string;
  tags: string[];
};

const PRODUCTS_DATA: SeedProduct[] = [
  {
    "catSlug": "may-tinh-pc",
    "name": "Siêu máy tính AI ASUS Ascent GX10 - Bộ",
    "slug": "sieu-may-tinh-ai-asus-ascent-gx10-bo",
    "sku": "sieu-may-tinh-ai-asus-ascent-gx10-bo",
    "brand": "ASUS",
    "price": 0,
    "originalPrice": null,
    "images": [
      "/images/products/thny_466793d4197c2166db86f2fb53d58137.jpg"
    ],
    "stock": 0,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Siêu máy tính AI ASUS Ascent GX10 - Bộ",
    "tags": [
      "ASUS"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Siêu máy tính AI MSI EdgeXpert MS-C931 4TB PCIe 5.0 - Bộ",
    "slug": "sieu-may-tinh-ai-msi-edgexpert-ms-c931-4tb-pcie-5-0-bo",
    "sku": "sieu-may-tinh-ai-msi-edgexpert-ms-c931-4tb-pcie-5-0-bo",
    "brand": "MSI",
    "price": 0,
    "originalPrice": null,
    "images": [
      "/images/products/thny_556268d72fb721af0b7cb063220aa5c1.jpg"
    ],
    "stock": 0,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Siêu máy tính AI MSI EdgeXpert MS-C931 4TB PCIe 5.0 - Bộ",
    "tags": [
      "MSI"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Siêu máy tính AI NVIDIA DGX Spark - Bộ",
    "slug": "sieu-may-tinh-ai-nvidia-dgx-spark-bo",
    "sku": "sieu-may-tinh-ai-nvidia-dgx-spark-bo",
    "brand": "NVIDIA",
    "price": 0,
    "originalPrice": null,
    "images": [
      "/images/products/thny_accbfd67103e9398531ed2474b8392ed.jpeg"
    ],
    "stock": 0,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Siêu máy tính AI NVIDIA DGX Spark - Bộ",
    "tags": [
      "NVIDIA"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ Lenovo ThinkCentre M75s Gen 5 - Bộ",
    "slug": "may-bo-lenovo-thinkcentre-m75s-gen-5-bo",
    "sku": "may-bo-lenovo-thinkcentre-m75s-gen-5-bo",
    "brand": "Lenovo",
    "price": 38000000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_bbc97af286b418a6f49f813261610e06.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Máy bộ Lenovo ThinkCentre M75s Gen 5 - Bộ",
    "tags": [
      "Lenovo"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ Mini PC FireBat T2 (CPU Intel N150/RAM 16GB/SSD 1TB NVMe/Win11) - Bộ",
    "slug": "may-bo-mini-pc-firebat-t2-cpu-intel-n150-ram-16gb-ssd-1tb-nvme-win11-bo",
    "sku": "may-bo-mini-pc-firebat-t2-cpu-intel-n150-ram-16gb-ssd-1tb-nvme-win11-bo",
    "brand": "FireBat",
    "price": 11500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_f96dec76eb7c3e3ff870bc89e8ca6c01.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy bộ Mini PC FireBat T2 (CPU Intel N150/RAM 16GB/SSD 1TB NVMe/Win11) - Bộ",
    "tags": [
      "FireBat"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy tính MSI PRO DP180 14A-837XVN/I5 - Bộ",
    "slug": "may-tinh-msi-pro-dp180-14a-837xvn-i5-bo",
    "sku": "may-tinh-msi-pro-dp180-14a-837xvn-i5-bo",
    "brand": "MSI",
    "price": 17500000,
    "originalPrice": 20588000,
    "images": [
      "/images/products/thny_4838c728e7262683870b7f674ab47950.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Máy tính MSI PRO DP180 14A-837XVN/I5 - Bộ",
    "tags": [
      "MSI"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy tính nguyên bộ PV Home Office MKP A30196 (AMD Ryzen 3-3200G/8GB/ 500GB SSD)",
    "slug": "may-tinh-nguyen-bo-pv-home-office-mkp-a30196-amd-ryzen-3-3200g-8gb-500gb-ssd-bo",
    "sku": "may-tinh-nguyen-bo-pv-home-office-mkp-a30196-amd-ryzen-3-3200g-8gb-500gb-ssd-bo",
    "brand": "PV Home Office",
    "price": 8500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_a21ac54a58e433cbdb540996af4a46e5.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy tính nguyên bộ PV Home Office MKP A30196 (AMD Ryzen 3-3200G/8GB/ 500GB SSD)",
    "tags": [
      "PV Home Office"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy tính nguyên bộ PC PV Home Office AMD Ryzen 3-4300G/8GB DDR4/500GB SSD",
    "slug": "may-tinh-nguyen-bo-pc-pv-home-office-a30118-amd-ryzen-3-4300g-8gb-500gb-ssd-bo",
    "sku": "may-tinh-nguyen-bo-pc-pv-home-office-a30118-amd-ryzen-3-4300g-8gb-500gb-ssd-bo",
    "brand": "PV Home Office",
    "price": 9900000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_7a1895fb84eb66037d6cd9bf418bbef4.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Máy tính nguyên bộ PC PV Home Office AMD Ryzen 3-4300G/8GB DDR4/500GB SSD",
    "tags": [
      "PV Home Office"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy tính nguyên bộ ROSA OFFICE A56450-16 512M",
    "slug": "may-tinh-nguyen-bo-rosa-office-a56450-16-512m-bo",
    "sku": "may-tinh-nguyen-bo-rosa-office-a56450-16-512m-bo",
    "brand": "ROSA OFFICE",
    "price": 17500000,
    "originalPrice": 20588000,
    "images": [
      "/images/products/thny_9b655b3f0236a3577a555115c5762bb0.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy tính nguyên bộ ROSA OFFICE A56450-16 512M",
    "tags": [
      "ROSA OFFICE"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ văn phòng ROSA OFFICE I - Bộ",
    "slug": "may-bo-van-phong-rosa-office-i-bo",
    "sku": "may-bo-van-phong-rosa-office-i-bo",
    "brand": "ROSA OFFICE",
    "price": 12500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_7a3786627e65ba9c37741da6af9b0221.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy bộ văn phòng ROSA OFFICE I - Bộ",
    "tags": [
      "ROSA OFFICE"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ văn phòng cao cấp ROSA V1024 1TB",
    "slug": "may-bo-van-phong-cao-cap-v1024-1tb-bo",
    "sku": "may-bo-van-phong-cao-cap-v1024-1tb-bo",
    "brand": "ROSA",
    "price": 13500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_6eb7d4741ec90f2d95f914bf41e98512.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Máy bộ văn phòng cao cấp ROSA V1024 1TB",
    "tags": [
      "ROSA"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ Mini PC Dell Optiplex 7050 Micro Core i5-7500T/8GB/256GB (2nd)",
    "slug": "may-bo-mini-pc-dell-optiplex-7050-micro-core-i5-7500t-8-gb-256-gb-bo",
    "sku": "may-bo-mini-pc-dell-optiplex-7050-micro-core-i5-7500t-8-gb-256-gb-bo",
    "brand": "Dell",
    "price": 5500000,
    "originalPrice": 6471000,
    "images": [
      "/images/products/thny_299bc1b8ab99002638943319d0563cd3.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Máy bộ Mini PC Dell Optiplex 7050 Micro Core i5-7500T/8GB/256GB (2nd)",
    "tags": [
      "Dell"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ văn phòng cao cấp ROSA V1024",
    "slug": "may-bo-van-phong-cao-cap-rosa-v1024-bo",
    "sku": "may-bo-van-phong-cao-cap-rosa-v1024-bo",
    "brand": "ROSA",
    "price": 11500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_b81fbbcdbfe900a486d331b85a3d14b1.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy bộ văn phòng cao cấp ROSA V1024",
    "tags": [
      "ROSA"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy chủ chuyên dùng cao cấp WS 41284 - Bộ",
    "slug": "may-chu-chuyen-dung-cao-cap-ws-41284-bo",
    "sku": "may-chu-chuyen-dung-cao-cap-ws-41284-bo",
    "brand": "WS",
    "price": 18500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_9a6d1f84ddfcf997958465b148617f4f.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy chủ chuyên dùng cao cấp WS 41284 - Bộ",
    "tags": [
      "WS"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy Kiosk Hành chính công",
    "slug": "may-kiosk-bam-so-hanh-chinh-cong-he-thong",
    "sku": "may-kiosk-bam-so-hanh-chinh-cong-he-thong",
    "brand": "",
    "price": 39000000,
    "originalPrice": 45882000,
    "images": [
      "/images/products/thny_eb57424e8590100e22f10822aabf3c06.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy Kiosk Hành chính công",
    "tags": []
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy chủ Dell PowerEdge R450 Intel Xeon Silver 4310, 16GB, 4TB HDD SAS (up to 4x3,5\"), H755, iDRAC9 Ent, DP 1Gb LOM, 5720 QP 1GbE, 800W, 4YrPro - Bộ",
    "slug": "may-chu-dell-poweredge-r450-intel-xeon-silver-4310-16gb-4tb-hdd-sas-up-to-4x35-h755-idrac9-ent-dp-1gb-lom-5720-qp-1gbe-800w-4yrpro-bo",
    "sku": "may-chu-dell-poweredge-r450-intel-xeon-silver-4310-16gb-4tb-hdd-sas-up-to-4x35-h755-idrac9-ent-dp-1gb-lom-5720-qp-1gbe-800w-4yrpro-bo",
    "brand": "Dell",
    "price": 97000000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_150cd43d8be1c719eff612a0d3af70f9.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": true,
    "shortDescription": "Máy chủ Dell PowerEdge R450 Intel Xeon Silver 4310, 16GB, 4TB HDD SAS (up to 4x3,5\"), H755, iDRAC9 Ent, DP 1Gb LOM, 5720 QP 1GbE, 800W, 4YrPro - Bộ",
    "tags": [
      "Dell"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ Mini PC MSI Cubi 5 12M Core i3-1215U/WF/BT/nonOS",
    "slug": "may-bo-mini-pc-msi-cubi-5-12m-413bvn-core-i3-1215u-wf-bt-nonos-bo",
    "sku": "may-bo-mini-pc-msi-cubi-5-12m-413bvn-core-i3-1215u-wf-bt-nonos-bo",
    "brand": "MSI",
    "price": 8500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_d1649e37ece3b313b2f66d540c5118f2.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy bộ Mini PC MSI Cubi 5 12M Core i3-1215U/WF/BT/nonOS",
    "tags": [
      "MSI"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ Dell Optiplex 7010 SFF Core-i7 3770/DRR3 16GB/SSD 256GB (2nd)",
    "slug": "may-bo-dell-optiplex-7010-sff-core-i7-3770-drr3-16gb-ssd-256gb-2nd",
    "sku": "may-bo-dell-optiplex-7010-sff-core-i7-3770-drr3-16gb-ssd-256gb-2nd",
    "brand": "Dell",
    "price": 2950000,
    "originalPrice": 3471000,
    "images": [
      "/images/products/thny_ff9c6cf30bca0ceb763b6adf0a79245c.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy bộ Dell Optiplex 7010 SFF Core-i7 3770/DRR3 16GB/SSD 256GB (2nd)",
    "tags": [
      "Dell"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy chủ Dell PowerEdge T150 (Mini Tower 4U - 4x 3.5\") - Bộ",
    "slug": "may-chu-dell-poweredge-t150-mini-tower-4u-4x-3-5-bo",
    "sku": "may-chu-dell-poweredge-t150-mini-tower-4u-4x-3-5-bo",
    "brand": "Dell",
    "price": 36000000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_7746aa23e4b7a98d92d2fdcedd1330fe.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy chủ Dell PowerEdge T150 (Mini Tower 4U - 4x 3.5\") - Bộ",
    "tags": [
      "Dell"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ WorkStation Dell Precision 3680 Tower - Bộ",
    "slug": "may-bo-workstation-dell-precision-3680-tower-bo",
    "sku": "may-bo-workstation-dell-precision-3680-tower-bo",
    "brand": "Dell",
    "price": 0,
    "originalPrice": null,
    "images": [
      "/images/products/thny_cb94126595ae320e2c632bfbffb8c4c0.jpg"
    ],
    "stock": 0,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Máy bộ WorkStation Dell Precision 3680 Tower - Bộ",
    "tags": [
      "Dell"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Bộ máy tính văn phòng Rosa Office Zero - Bộ",
    "slug": "bo-may-tinh-van-phong-rosa-office-zero-bo",
    "sku": "bo-may-tinh-van-phong-rosa-office-zero-bo",
    "brand": "",
    "price": 0,
    "originalPrice": null,
    "images": [
      "/images/products/thny_750d015d02d8f924c315fce9ead48364.jpg"
    ],
    "stock": 0,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Bộ máy tính văn phòng Rosa Office Zero - Bộ",
    "tags": []
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy tính để bàn đồng bộ Dell Inspiron 3030 Tower T6FDR1 (i5-14400/8GB DDR5/512GB SSD/Win11SL) - Bộ",
    "slug": "may-tinh-de-ban-dong-bo-dell-inspiron-3030-tower-t6fdr1-i5-14400-8gb-ddr5-512gb-ssd-win11sl-bo",
    "sku": "may-tinh-de-ban-dong-bo-dell-inspiron-3030-tower-t6fdr1-i5-14400-8gb-ddr5-512gb-ssd-win11sl-bo",
    "brand": "Dell",
    "price": 15000000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_def02e29a2e762afb8142687b814b562.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy tính để bàn đồng bộ Dell Inspiron 3030 Tower T6FDR1 (i5-14400/8GB DDR5/512GB SSD/Win11SL) - Bộ",
    "tags": [
      "Dell"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy tính để bàn đồng bộ Dell OptiPlex 7020 SFF (i3-12100/8GB DDR5/512GB SSD/Win11Home) - Bộ",
    "slug": "may-tinh-de-ban-dong-bo-dell-optiplex-7020-sff-i3-12100-8gb-ddr5-512gb-ssd-win11home-bo",
    "sku": "may-tinh-de-ban-dong-bo-dell-optiplex-7020-sff-i3-12100-8gb-ddr5-512gb-ssd-win11home-bo",
    "brand": "Dell",
    "price": 12850000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_241a664b6f28694168e3318338a83585.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy tính để bàn đồng bộ Dell OptiPlex 7020 SFF (i3-12100/8GB DDR5/512GB SSD/Win11Home) - Bộ",
    "tags": [
      "Dell"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy tính All in One ASUS AiO A3 i5-1355U/8GB/512GB/23.8\" (A3402WV) màu trắng - Bộ",
    "slug": "may-tinh-all-in-one-asus-aio-a3-i5-1355u-8gb-512gb-23-8-a3402wv-mau-trang-bo",
    "sku": "may-tinh-all-in-one-asus-aio-a3-i5-1355u-8gb-512gb-23-8-a3402wv-mau-trang-bo",
    "brand": "Asus",
    "price": 17900000,
    "originalPrice": 21059000,
    "images": [
      "/images/products/thny_12f7531b4a27e332a89f6385c37954a8.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Máy tính All in One ASUS AiO A3 i5-1355U/8GB/512GB/23.8\" (A3402WV) màu trắng - Bộ",
    "tags": [
      "Asus"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ Mini PC Asus i3-1220P/2xDDR4 3200Mhz/NVMe+SATA RNUC12WSHI200000I - Cái",
    "slug": "mini-pc-asus-i3-1220p-rnuc12wshi200000i-ean-cai",
    "sku": "mini-pc-asus-i3-1220p-rnuc12wshi200000i-ean-cai",
    "brand": "Asus",
    "price": 7990000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_cc180162e1381ae2e918696d14dd9109.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy bộ Mini PC Asus i3-1220P/2xDDR4 3200Mhz/NVMe+SATA RNUC12WSHI200000I - Cái",
    "tags": [
      "Asus"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Bộ máy tính SingPC Core i3",
    "slug": "bo-may-tinh-singpc-core-i3",
    "sku": "bo-may-tinh-singpc-core-i3",
    "brand": "",
    "price": 9500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_fd0126e9618fd204068cf4a36ecf26c8.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Bộ máy tính SingPC Core i3",
    "tags": []
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Bộ máy tính SingPC Pentium Gold",
    "slug": "bo-may-tinh-singpc-pentium-gold",
    "sku": "bo-may-tinh-singpc-pentium-gold",
    "brand": "",
    "price": 8500000,
    "originalPrice": 10000000,
    "images": [
      "/images/products/thny_a07d13541a4c21275719e1f75a796618.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Bộ máy tính SingPC Pentium Gold",
    "tags": []
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy tính bàn đồng bộ Dell OptiPlex 7010 Tower (i3-12100/DDR4 8GB/SSD NVMe 512GB) - Bộ",
    "slug": "may-tinh-ban-dong-bo-dell-optiplex-7010-tower-i3-12100-ddr4-8gb-ssd-nvme-512gb",
    "sku": "may-tinh-ban-dong-bo-dell-optiplex-7010-tower-i3-12100-ddr4-8gb-ssd-nvme-512gb",
    "brand": "Dell",
    "price": 11500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_4b0c54c86b627e6709d3d6d608196a24.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Máy tính bàn đồng bộ Dell OptiPlex 7010 Tower (i3-12100/DDR4 8GB/SSD NVMe 512GB) - Bộ",
    "tags": [
      "Dell"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy tính bàn đồng bộ HP 280 Pro G9 SFF 9H1S3PT ( i3-13100/DDR4 8GB/SSD NVMe 256GB/WL/BT/KB/M/W11SL/ĐEN) - Bộ",
    "slug": "may-tinh-ban-dong-bo-hp-280-pro-g9-sff-9h1s3pt-i3-13100-ddr4-8gb-ssd-nvme-256gb-wl-bt-kb-m-w11sl-den",
    "sku": "may-tinh-ban-dong-bo-hp-280-pro-g9-sff-9h1s3pt-i3-13100-ddr4-8gb-ssd-nvme-256gb-wl-bt-kb-m-w11sl-den",
    "brand": "HP",
    "price": 11700000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_54c9330d0e0dbdd151c257dd778663b2.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy tính bàn đồng bộ HP 280 Pro G9 SFF 9H1S3PT ( i3-13100/DDR4 8GB/SSD NVMe 256GB/WL/BT/KB/M/W11SL/ĐEN) - Bộ",
    "tags": [
      "HP"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy chủ HPE ProLiant ML30 Gen10 Pro (2nd) - Bộ",
    "slug": "may-chu-hpe-proliant-ml30-gen10-pro-2nd",
    "sku": "may-chu-hpe-proliant-ml30-gen10-pro-2nd",
    "brand": "HPE",
    "price": 20000000,
    "originalPrice": 23529000,
    "images": [
      "/images/products/thny_d6c4e48c7b0219b56fe3d9c26b1b89fb.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy chủ HPE ProLiant ML30 Gen10 Pro (2nd) - Bộ",
    "tags": [
      "HPE"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy tính để bàn đồng bộ Dell Optiplex 3000 MT (i3-12100 | 8GB | SSD 256GB | DVD |K_M | FreeDOS) - Bộ",
    "slug": "may-tinh-de-ban-dong-bo-dell-optiplex-3000-mt-i3-12100-8gb-ssd-256gb-dvd-k_m-freedos",
    "sku": "may-tinh-de-ban-dong-bo-dell-optiplex-3000-mt-i3-12100-8gb-ssd-256gb-dvd-k_m-freedos",
    "brand": "Dell",
    "price": 11690000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_b98d5f76eb92e7c4cab5163ec96064f7.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Máy tính để bàn đồng bộ Dell Optiplex 3000 MT (i3-12100 | 8GB | SSD 256GB | DVD |K_M | FreeDOS) - Bộ",
    "tags": [
      "Dell"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy tính để bàn Dell Inspiron 3020 Core i5-13400(10*2.5), 16GB DDR4, 512GB SSD, Wireless+Bluetooth, Dell Optical Mouse & Keyboard, Win11Home - Bộ",
    "slug": "may-tinh-de-ban-dell-inspiron-3020-core-i5-13400102-5-16gb-ddr4-512gb-ssd-wirelessbluetooth-dell-optical-mouse-keyboard-win11home",
    "sku": "may-tinh-de-ban-dell-inspiron-3020-core-i5-13400102-5-16gb-ddr4-512gb-ssd-wirelessbluetooth-dell-optical-mouse-keyboard-win11home",
    "brand": "Dell",
    "price": 15400000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_a90f246e0fa521ea84cc4e11e18799c8.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Máy tính để bàn Dell Inspiron 3020 Core i5-13400(10*2.5), 16GB DDR4, 512GB SSD, Wireless+Bluetooth, Dell Optical Mouse & Keyboard, Win11Home - Bộ",
    "tags": [
      "Dell"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ HP t610 Flexible Thin Client (AMD G-T56N/PC3 4GB/SATA MLC 16GB) - Cái",
    "slug": "may-bo-hp-t610-flexible-thin-client-amd-g-t56n-pc3-4gb-sata-mlc-16gb",
    "sku": "may-bo-hp-t610-flexible-thin-client-amd-g-t56n-pc3-4gb-sata-mlc-16gb",
    "brand": "HP",
    "price": 1850000,
    "originalPrice": 2176000,
    "images": [
      "/images/products/thny_9fd7e2900ef78dc26de41ed1979116dc.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy bộ HP t610 Flexible Thin Client (AMD G-T56N/PC3 4GB/SATA MLC 16GB) - Cái",
    "tags": [
      "HP"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy tính All in One VSP ZZ 19 inch - Bộ",
    "slug": "may-tinh-all-in-one-vsp-zz-19-inch",
    "sku": "may-tinh-all-in-one-vsp-zz-19-inch",
    "brand": "VSP",
    "price": 6800000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_978817e9d14897c6d6e9bc32992f98f3.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy tính All in One VSP ZZ 19 inch - Bộ",
    "tags": [
      "VSP"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ Dell Optiplex 5040 SFF (Core i3-6100/DDR4 8GB) 2nd - Bộ",
    "slug": "may-bo-dell-optiplex-5040-sff-core-i3-6100-ddr4-8gb-2nd",
    "sku": "may-bo-dell-optiplex-5040-sff-core-i3-6100-ddr4-8gb-2nd",
    "brand": "Dell",
    "price": 3000000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_27e2bcb462a2b97fbdab9fa423cb33dd.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy bộ Dell Optiplex 5040 SFF (Core i3-6100/DDR4 8GB) 2nd - Bộ",
    "tags": [
      "Dell"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ Dell Optiplex 3040 SFF (Core i3-6100/DDR4 8GB) 2nd - Bộ",
    "slug": "may-bo-dell-optiplex-3040-sff-core-i3-6100-ddr4-8gb-2nd",
    "sku": "may-bo-dell-optiplex-3040-sff-core-i3-6100-ddr4-8gb-2nd",
    "brand": "Dell",
    "price": 3000000,
    "originalPrice": 3529000,
    "images": [
      "/images/products/thny_d37164798bfc385f455e6027f7e42a6d.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": true,
    "shortDescription": "Máy bộ Dell Optiplex 3040 SFF (Core i3-6100/DDR4 8GB) 2nd - Bộ",
    "tags": [
      "Dell"
    ]
  },
  {
    "catSlug": "may-tinh-pc",
    "name": "Máy bộ HP 202 G1 MT - Cái",
    "slug": "may-bo-hp-202-g1-mt-g2020",
    "sku": "may-bo-hp-202-g1-mt-g2020",
    "brand": "HP",
    "price": 1800000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_14bb92bb405235178c5ebfb58373596b.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy bộ HP 202 G1 MT - Cái",
    "tags": [
      "HP"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Hikvision DS-2CD2023G2-LI2U 2MP - Cái",
    "slug": "camera-ip-hikvision-ds-2cd2023g2-li2u-2mp-cai",
    "sku": "camera-ip-hikvision-ds-2cd2023g2-li2u-2mp-cai",
    "brand": "Hikvision",
    "price": 2570000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_0e61b59c00036757eb0d3cf6e61e02f8.jpg"
    ],
    "stock": 0,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera IP Hikvision DS-2CD2023G2-LI2U 2MP - Cái",
    "tags": [
      "Hikvision"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Hikvision DS-2CD2643G2-LIZS2U 4MP - Cái",
    "slug": "camera-ip-hikvision-ds-2cd2643g2-lizs2u-4mp-cai",
    "sku": "camera-ip-hikvision-ds-2cd2643g2-lizs2u-4mp-cai",
    "brand": "Hikvision",
    "price": 4550000,
    "originalPrice": 5353000,
    "images": [
      "/images/products/thny_9b9e4d0c02ad9b72606a3e9b1c331390.jpg"
    ],
    "stock": 0,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera IP Hikvision DS-2CD2643G2-LIZS2U 4MP - Cái",
    "tags": [
      "Hikvision"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP dome Hikvision DS-2CD2143G2-LIS2U 4MP - Cái",
    "slug": "camera-ip-dome-hikvision-ds-2cd2143g2-lis2u-4mp-cai",
    "sku": "camera-ip-dome-hikvision-ds-2cd2143g2-lis2u-4mp-cai",
    "brand": "Hikvision",
    "price": 2840000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_480e88d3089a4d8913509f0e5e32c8b9.jpg"
    ],
    "stock": 0,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Camera IP dome Hikvision DS-2CD2143G2-LIS2U 4MP - Cái",
    "tags": [
      "Hikvision"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera Wifi ngoài trời Ezviz H3C 3.0Mpx Full Color",
    "slug": "camera-wifi-ngoai-troi-ezviz-h3c-3-0mpx-full-color",
    "sku": "camera-wifi-ngoai-troi-ezviz-h3c-3-0mpx-full-color",
    "brand": "Ezviz",
    "price": 1680000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_79d49bd238dac0231774e4903b289ecd.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Camera Wifi ngoài trời Ezviz H3C 3.0Mpx Full Color",
    "tags": [
      "Ezviz"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera Wifi Dahua DH-P5AS-PV 5MP - Cái",
    "slug": "camera-wifi-dahua-dh-p5as-pv-5mp-cai",
    "sku": "camera-wifi-dahua-dh-p5as-pv-5mp-cai",
    "brand": "Dahua",
    "price": 0,
    "originalPrice": null,
    "images": [
      "/images/products/thny_185e5ea658aafd45727e3f54bcbd7842.jpg"
    ],
    "stock": 0,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera Wifi Dahua DH-P5AS-PV 5MP - Cái",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera Wifi Uniarch Uho-C1-M3F3 3MP",
    "slug": "camera-wifi-uniarch-uho-c1-m3f3-3mp-cai",
    "sku": "camera-wifi-uniarch-uho-c1-m3f3-3mp-cai",
    "brand": "Uniarch",
    "price": 950000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_e8b3f23ab14e58c2078b3102cb82c2f9.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera Wifi Uniarch Uho-C1-M3F3 3MP",
    "tags": [
      "Uniarch"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP 4G MEARI G1 3MP (tặng SIM 4G chuyên dụng 1 năm) - Cái",
    "slug": "camera-ip-4g-meari-g1-3mp-tang-sim-4g-chuyen-dung-1-nam-cai",
    "sku": "camera-ip-4g-meari-g1-3mp-tang-sim-4g-chuyen-dung-1-nam-cai",
    "brand": "",
    "price": 2900000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_3e3dddc1c47319231f5d1abd5ed95a76.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Camera IP 4G MEARI G1 3MP (tặng SIM 4G chuyên dụng 1 năm) - Cái",
    "tags": []
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera Wifi imou Titan Pro 3K+ 6MP Aurora IPC-U7LP-6V0NE full màu ban đêm",
    "slug": "camera-wif-imou-titan-pro-3k-6mp-aurora-ipc-u7lp-6v0ne-full-mau-ban-dem-cai",
    "sku": "camera-wif-imou-titan-pro-3k-6mp-aurora-ipc-u7lp-6v0ne-full-mau-ban-dem-cai",
    "brand": "Imou",
    "price": 3990000,
    "originalPrice": 4694000,
    "images": [
      "/images/products/thny_0d3d3bfbc65b41ae222bdf93b056ce45.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera Wifi imou Titan Pro 3K+ 6MP Aurora IPC-U7LP-6V0NE full màu ban đêm",
    "tags": [
      "Imou"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera 4G Dahua DH-P4F-PV-4G 4MP PT outdoor - Cái",
    "slug": "camera-4g-dahua-dh-p4f-pv-4g-4mp-pt-outdoor-cai",
    "sku": "camera-4g-dahua-dh-p4f-pv-4g-4mp-pt-outdoor-cai",
    "brand": "Dahua",
    "price": 2990000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_378664f7deb5f1e085125ad550f1cbb1.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Camera 4G Dahua DH-P4F-PV-4G 4MP PT outdoor - Cái",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera giám sát UNV TIC7626EL-GAF75-4X56-VH1 4MP - Bộ",
    "slug": "camera-giam-sat-unv-tic7626el-gaf75-4x56-vh1-4mp-bo",
    "sku": "camera-giam-sat-unv-tic7626el-gaf75-4x56-vh1-4mp-bo",
    "brand": "UNV",
    "price": 685000000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_64d6728d0a86b497b2779ab00afe7ebf.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera giám sát UNV TIC7626EL-GAF75-4X56-VH1 4MP - Bộ",
    "tags": [
      "UNV"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Thẻ nhớ MicroSDXC Kingston Canvas Select Plus 100R CL10 64GB - Thẻ",
    "slug": "the-nho-microsdxc-kingston-canvas-select-plus-100r-cl10-64gb-the",
    "sku": "the-nho-microsdxc-kingston-canvas-select-plus-100r-cl10-64gb-the",
    "brand": "Kingston",
    "price": 480000,
    "originalPrice": 565000,
    "images": [
      "/images/products/thny_12f1c424389cbda1a8148d6af21eeb60.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Thẻ nhớ MicroSDXC Kingston Canvas Select Plus 100R CL10 64GB - Thẻ",
    "tags": [
      "Kingston"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera Dahua 4G PICOO A2 DH-P3AE-PV-4G 5MP outdoor",
    "slug": "camera-dahua-4g-picoo-a2-dh-p5ae-pv-4g-5mp-outdoor-cai",
    "sku": "camera-dahua-4g-picoo-a2-dh-p5ae-pv-4g-5mp-outdoor-cai",
    "brand": "Dahua",
    "price": 2250000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_231435b8595b0ff6162014b628dcb734.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera Dahua 4G PICOO A2 DH-P3AE-PV-4G 5MP outdoor",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera Dahua 4G PICOO A2 DH-P5AE-PV-4G 3MP outdoor - Cái",
    "slug": "camera-dahua-4g-picoo-a2-dh-p5ae-pv-4g-3mp-outdoor-cai",
    "sku": "camera-dahua-4g-picoo-a2-dh-p5ae-pv-4g-3mp-outdoor-cai",
    "brand": "Dahua",
    "price": 1950000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_6a7634da68c45c84e67659c9b05a4222.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera Dahua 4G PICOO A2 DH-P5AE-PV-4G 3MP outdoor - Cái",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera Wifi Uniarch Uho-P3C-M5F4 5MP Wise-ISP Full Color",
    "slug": "camera-wifi-uniarch-uho-p3c-m5f4-5mp-cai",
    "sku": "camera-wifi-uniarch-uho-p3c-m5f4-5mp-cai",
    "brand": "Uniarch",
    "price": 2990000,
    "originalPrice": 3518000,
    "images": [
      "/images/products/thny_9c006b8c4674697ffc3528e6ca351d03.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Camera Wifi Uniarch Uho-P3C-M5F4 5MP Wise-ISP Full Color",
    "tags": [
      "Uniarch"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Thẻ nhớ Imou T1 32GB chuyên dụng camera - Thẻ",
    "slug": "the-nho-imou-t1-32gb-chuyen-dung-camera-the",
    "sku": "the-nho-imou-t1-32gb-chuyen-dung-camera-the",
    "brand": "Imou",
    "price": 250000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_ecd472e37189a45879fd41c3a18ae9da.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Thẻ nhớ Imou T1 32GB chuyên dụng camera - Thẻ",
    "tags": [
      "Imou"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Thẻ nhớ Patriot 64GB - Thẻ",
    "slug": "the-nho-patriot-64gb-the",
    "sku": "the-nho-patriot-64gb-the",
    "brand": "Patriot",
    "price": 350000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_0c2444b8bcea9c2a16e9b2bc7d3b84e0.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Thẻ nhớ Patriot 64GB - Thẻ",
    "tags": [
      "Patriot"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Switch mạng Cudy FS105 5 ports (10/100 Mbps) - Cái",
    "slug": "switch-mang-cudy-fs105-5-ports-10-100-mbps-cai",
    "sku": "switch-mang-cudy-fs105-5-ports-10-100-mbps-cai",
    "brand": "Cudy",
    "price": 180000,
    "originalPrice": 212000,
    "images": [
      "/images/products/thny_5a31a565ed1f3fd4574362ac52921547.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Switch mạng Cudy FS105 5 ports (10/100 Mbps) - Cái",
    "tags": [
      "Cudy"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Switch mạng Cudy FS108 8 ports (10/100 Mbps) - Cái",
    "slug": "switch-mang-cudy-fs108-8-ports-10-100-mbps-cai",
    "sku": "switch-mang-cudy-fs108-8-ports-10-100-mbps-cai",
    "brand": "Cudy",
    "price": 250000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_9395f50323db089cd0ba91b3cc0a3219.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Switch mạng Cudy FS108 8 ports (10/100 Mbps) - Cái",
    "tags": [
      "Cudy"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Đầu ghi Dahua DH-XVR5116HS-5M-I3/T 16 kênh",
    "slug": "dau-ghi-dahua-dh-xvr5116hs-5m-i3-t-16-kenh-cai",
    "sku": "dau-ghi-dahua-dh-xvr5116hs-5m-i3-t-16-kenh-cai",
    "brand": "Dahua",
    "price": 6490000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_120f1a81f09fc727ba2cc05fc7ac7918.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": true,
    "shortDescription": "Đầu ghi Dahua DH-XVR5116HS-5M-I3/T 16 kênh",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Đầu ghi Dahua DH-XVR1B08-I/T 8 kênh",
    "slug": "dau-ghi-dahua-dh-xvr1b08-i-t-8-kenh-cai",
    "sku": "dau-ghi-dahua-dh-xvr1b08-i-t-8-kenh-cai",
    "brand": "Dahua",
    "price": 2380000,
    "originalPrice": 2800000,
    "images": [
      "/images/products/thny_4864ff701bc68cf897c0f29548e113d4.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Đầu ghi Dahua DH-XVR1B08-I/T 8 kênh",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera Hikvision DS-2CD1143G2-LIUF 4MP",
    "slug": "camera-hikvision-ds-2cd1143g2-liuf-4mp-cai",
    "sku": "camera-hikvision-ds-2cd1143g2-liuf-4mp-cai",
    "brand": "Hikvision",
    "price": 2200000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_4e43ee17d78ea50613b8d8b9535f8b0b.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera Hikvision DS-2CD1143G2-LIUF 4MP",
    "tags": [
      "Hikvision"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Switch PoE Hikvision DS-3E1318P-EI/M 16 ports",
    "slug": "switch-poe-hikvision-ds-3e1318p-ei-m-16-ports-cai",
    "sku": "switch-poe-hikvision-ds-3e1318p-ei-m-16-ports-cai",
    "brand": "Hikvision",
    "price": 5200000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_a1ba359be288f223d2bd8062b672d4cd.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Switch PoE Hikvision DS-3E1318P-EI/M 16 ports",
    "tags": [
      "Hikvision"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Wifi MEARI S2 PLUS 4MP",
    "slug": "camera-ip-wifi-meari-s2-plus-4mp-cai",
    "sku": "camera-ip-wifi-meari-s2-plus-4mp-cai",
    "brand": "Meari",
    "price": 1850000,
    "originalPrice": 2176000,
    "images": [
      "/images/products/thny_dc82ec8aced44cf55daf3f274a326d81.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Camera IP Wifi MEARI S2 PLUS 4MP",
    "tags": [
      "Meari"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Cánh tay camera sắt dài 1,5 mét (mạ kẽm, sơn trắng) - Cái",
    "slug": "canh-tay-camera-sat-dai-15-met-ma-kem-son-trang-cai",
    "sku": "canh-tay-camera-sat-dai-15-met-ma-kem-son-trang-cai",
    "brand": "",
    "price": 500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_51ffbfbdebf194c26b37566b90e41be7.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Cánh tay camera sắt dài 1,5 mét (mạ kẽm, sơn trắng) - Cái",
    "tags": []
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera HDTVI HikVision DS-2CE16D0T-EXLPF Dual Light 2.0Mpx - Cái",
    "slug": "camera-hdtvi-hikvision-ds-2ce16d0t-exlpf-dual-light-2-0mpx-cai",
    "sku": "camera-hdtvi-hikvision-ds-2ce16d0t-exlpf-dual-light-2-0mpx-cai",
    "brand": "Hikvision",
    "price": 960000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_f636317c402048b1d582d2bcc45eaa6a.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera HDTVI HikVision DS-2CE16D0T-EXLPF Dual Light 2.0Mpx - Cái",
    "tags": [
      "Hikvision"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Đầu ghi DVR Ai KBVision KX-7108Ai 8 kênh",
    "slug": "dau-ghi-dvr-ai-kbvision-kx-7108ai-8-kenh-bo",
    "sku": "dau-ghi-dvr-ai-kbvision-kx-7108ai-8-kenh-bo",
    "brand": "KBVision",
    "price": 2760000,
    "originalPrice": 3247000,
    "images": [
      "/images/products/thny_9b0cba6d6921c04db9aa7b4f50013ae2.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Đầu ghi DVR Ai KBVision KX-7108Ai 8 kênh",
    "tags": [
      "KBVision"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera HDCVI Dahua DH-HAC-HFW1200RLP-IL-T 2MP",
    "slug": "camera-hdcvi-dahua-dh-hac-hfw1200rlp-il-t-2mp-cai",
    "sku": "camera-hdcvi-dahua-dh-hac-hfw1200rlp-il-t-2mp-cai",
    "brand": "Dahua",
    "price": 1050000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_6f5486d3054d07a57d4311ff94166cba.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Camera HDCVI Dahua DH-HAC-HFW1200RLP-IL-T 2MP",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera HDCVI Wizcolor ánh sáng kép Dahua DH-HAC-HFW1249X-IL-A-PRO 2MP",
    "slug": "camera-hdcvi-wizcolor-anh-sang-kep-dahua-dh-hac-hfw1249x-il-a-pro-2mp-cai",
    "sku": "camera-hdcvi-wizcolor-anh-sang-kep-dahua-dh-hac-hfw1249x-il-a-pro-2mp-cai",
    "brand": "Dahua",
    "price": 1950000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_3f0849ecac89bddfabd02192c45f1c19.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera HDCVI Wizcolor ánh sáng kép Dahua DH-HAC-HFW1249X-IL-A-PRO 2MP",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera NLMT MEARI V2 SSL Smart 4G AOV (tặng SIM 4G 1 năm)",
    "slug": "camera-nlmt-meari-v2-ssl-smart-4g-aov-tang-sim-4g-1-nam-cai",
    "sku": "camera-nlmt-meari-v2-ssl-smart-4g-aov-tang-sim-4g-1-nam-cai",
    "brand": "Meari",
    "price": 4800000,
    "originalPrice": 5647000,
    "images": [
      "/images/products/thny_6528a545a71b5d2856ed4002d124e32b.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Camera NLMT MEARI V2 SSL Smart 4G AOV (tặng SIM 4G 1 năm)",
    "tags": [
      "Meari"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera NLMT MEARI V1 SSL Smart 4G AOV (tặng SIM 4G 1 năm)",
    "slug": "camera-nlmt-meari-v1-ssl-smart-4g-aov-tang-sim-4g-1-nam-cai",
    "sku": "camera-nlmt-meari-v1-ssl-smart-4g-aov-tang-sim-4g-1-nam-cai",
    "brand": "Meari",
    "price": 3800000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_57fba8c6560dad7dbe6ee74d5e3146cc.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera NLMT MEARI V1 SSL Smart 4G AOV (tặng SIM 4G 1 năm)",
    "tags": [
      "Meari"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Đầu ghi NVR Dahua DHI-NVR5232-EI 32 kênh",
    "slug": "dau-ghi-nvr-dahua-dhi-nvr5232-ei-16-kenh-cai",
    "sku": "dau-ghi-nvr-dahua-dhi-nvr5232-ei-16-kenh-cai",
    "brand": "Dahua",
    "price": 13500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_4cacc04cff43611819585e06939a2ee9.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Đầu ghi NVR Dahua DHI-NVR5232-EI 32 kênh",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera Wifi Turret DAHUA IPC-HDW1339DA-SW-PV 3MP - Cái",
    "slug": "camera-wifi-turret-dahua-ipc-hdw1339da-sw-pv-3mp-cai",
    "sku": "camera-wifi-turret-dahua-ipc-hdw1339da-sw-pv-3mp-cai",
    "brand": "Dahua",
    "price": 1500000,
    "originalPrice": 1765000,
    "images": [
      "/images/products/thny_05310e9d193917e592693501081c7610.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera Wifi Turret DAHUA IPC-HDW1339DA-SW-PV 3MP - Cái",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Dahua IPC-HFW1239TL1-A-IL 2MP - Cái",
    "slug": "camera-ip-dahua-ipc-hfw1239tl1-a-il-2mp-cai",
    "sku": "camera-ip-dahua-ipc-hfw1239tl1-a-il-2mp-cai",
    "brand": "Dahua",
    "price": 1690000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_f4552cbe88fbd0368776858adaba786e.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera IP Dahua IPC-HFW1239TL1-A-IL 2MP - Cái",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera Wifi Dahua IPC-HFW1539DTK1-SW-PV 5MP - Cái",
    "slug": "camera-wifi-dahua-ipc-hfw1539dtk1-sw-pv-5mp-cai",
    "sku": "camera-wifi-dahua-ipc-hfw1539dtk1-sw-pv-5mp-cai",
    "brand": "Dahua",
    "price": 1850000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_f83e4d2a74ecc33a67f75ba4da013ae6.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Camera Wifi Dahua IPC-HFW1539DTK1-SW-PV 5MP - Cái",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera Wifi Dahua IPC-HFW1339DTK1-SW-PV 3MP - Cái",
    "slug": "camera-wifi-dahua-ipc-hfw1339dtk1-sw-pv-3mp-cai",
    "sku": "camera-wifi-dahua-ipc-hfw1339dtk1-sw-pv-3mp-cai",
    "brand": "Dahua",
    "price": 1500000,
    "originalPrice": 1765000,
    "images": [
      "/images/products/thny_99970b16bc208a4940a4d74091899ee8.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Camera Wifi Dahua IPC-HFW1339DTK1-SW-PV 3MP - Cái",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Đầu ghi NVR Dahua DHI-NVR2108HS-4KS3 8 kênh - Cái",
    "slug": "dau-ghi-nvr-dahua-dhi-nvr2108hs-4ks3-8-kenh-cai",
    "sku": "dau-ghi-nvr-dahua-dhi-nvr2108hs-4ks3-8-kenh-cai",
    "brand": "Dahua",
    "price": 3110000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_8c3ec83691ef6e8cddbdb70a058359ca.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Đầu ghi NVR Dahua DHI-NVR2108HS-4KS3 8 kênh - Cái",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Đầu ghi NVR Dahua NVR2116HS-4KS3-VN 16 kênh",
    "slug": "dau-ghi-dahua-nvr2116hs-4ks3-vn-16-kenh-cai",
    "sku": "dau-ghi-dahua-nvr2116hs-4ks3-vn-16-kenh-cai",
    "brand": "Dahua",
    "price": 4030000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_6f85faf289676b7fec64085c4d31feff.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Đầu ghi NVR Dahua NVR2116HS-4KS3-VN 16 kênh",
    "tags": [
      "Dahua"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera Wifi 2 mắt Imou IPC-S7XEP-6M0WED 6MP",
    "slug": "camera-wifi-2-mat-imou-ipc-s7xep-6m0wed-6mp-cai",
    "sku": "camera-wifi-2-mat-imou-ipc-s7xep-6m0wed-6mp-cai",
    "brand": "Imou",
    "price": 2700000,
    "originalPrice": 3176000,
    "images": [
      "/images/products/thny_83bf0cd4fa0a8ba1d7211e767ce7d5fa.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera Wifi 2 mắt Imou IPC-S7XEP-6M0WED 6MP",
    "tags": [
      "Imou"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP HikVision ColorVu DS-2CD1B47G3H-LIUF/SRB 4.0 MP - Cái",
    "slug": "camera-ip-hikvision-colorvu-ds-2cd1b47g3h-liuf-srb-4-0-mp-cai",
    "sku": "camera-ip-hikvision-colorvu-ds-2cd1b47g3h-liuf-srb-4-0-mp-cai",
    "brand": "Hikvision",
    "price": 3750000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_3f94d025be30e34922c8030498c49a31.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": true,
    "shortDescription": "Camera IP HikVision ColorVu DS-2CD1B47G3H-LIUF/SRB 4.0 MP - Cái",
    "tags": [
      "Hikvision"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Wifi ngoài trời dùng Pin Imou Cell 3C IPC-K9DCP-3T0WE 3MP - Cái",
    "slug": "camera-ip-wifi-ngoai-troi-dung-pin-imou-cell-3c-ipc-k9dcp-3t0we-3mp-cai",
    "sku": "camera-ip-wifi-ngoai-troi-dung-pin-imou-cell-3c-ipc-k9dcp-3t0we-3mp-cai",
    "brand": "Imou",
    "price": 1990000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_5ae9a880b15c2d799ba42b0a203e4443.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera IP Wifi ngoài trời dùng Pin Imou Cell 3C IPC-K9DCP-3T0WE 3MP - Cái",
    "tags": [
      "Imou"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera UNV Dome IPC3612LB-AF28-ECO (Có PoE, micro) - Cái",
    "slug": "camera-unv-dome-ipc3612lb-af28-eco-co-poe-micro-cai",
    "sku": "camera-unv-dome-ipc3612lb-af28-eco-co-poe-micro-cai",
    "brand": "UNV",
    "price": 1490000,
    "originalPrice": 1753000,
    "images": [
      "/images/products/thny_9857178175639b60bab9b504a972f7a1.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera UNV Dome IPC3612LB-AF28-ECO (Có PoE, micro) - Cái",
    "tags": [
      "UNV"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera UNV thân IPC2122LB-AF40-ECO (Có PoE, micro tích hợp)",
    "slug": "camera-unv-than-ipc2122lb-af40-eco-co-poe-micro-tich-hop-cai",
    "sku": "camera-unv-than-ipc2122lb-af40-eco-co-poe-micro-tich-hop-cai",
    "brand": "UNV",
    "price": 1490000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_079bee2a72cd6e29a210dbd125baf1f9.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera UNV thân IPC2122LB-AF40-ECO (Có PoE, micro tích hợp)",
    "tags": [
      "UNV"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera giám sát hành trình nghị định 10 Adsun TMS-CAM-NĐ10 - Bộ",
    "slug": "camera-nghi-dinh-10-tms-cam-nd10-bo",
    "sku": "camera-nghi-dinh-10-tms-cam-nd10-bo",
    "brand": "Adsun",
    "price": 4950000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_0b9ba79dd79c6de61513cbc50703ff18.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Camera giám sát hành trình nghị định 10 Adsun TMS-CAM-NĐ10 - Bộ",
    "tags": [
      "Adsun"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera giám sát hành trình nghị định 10 Adsun TMS-CAM4A-NĐ10 - Bộ",
    "slug": "camera-nghi-dinh-10-adsun-model-tms-cam4a-nd10-bo",
    "sku": "camera-nghi-dinh-10-adsun-model-tms-cam4a-nd10-bo",
    "brand": "Adsun",
    "price": 6900000,
    "originalPrice": 8118000,
    "images": [
      "/images/products/thny_23090d0133e6dc25fd2ab4b28a2e47a4.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Camera giám sát hành trình nghị định 10 Adsun TMS-CAM4A-NĐ10 - Bộ",
    "tags": [
      "Adsun"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Cáp mạng ProCable CAT3 (4 lõi cường lực) cuộn 500 mét",
    "slug": "cap-mang-procable-cat3-4-loi-cuong-luc-cuon-500-met-met",
    "sku": "cap-mang-procable-cat3-4-loi-cuong-luc-cuon-500-met-met",
    "brand": "ProCable",
    "price": 8000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_f35852dfbce84817e94c6e30e1b02ca1.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Cáp mạng ProCable CAT3 (4 lõi cường lực) cuộn 500 mét",
    "tags": [
      "ProCable"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Cáp mạng ProCable CAT3 (4 lõi cường lực) cuộn 500 mét",
    "slug": "cap-mang-procable-cat3-4-loi-cuong-luc-cuon-500-met-cuon",
    "sku": "cap-mang-procable-cat3-4-loi-cuong-luc-cuon-500-met-cuon",
    "brand": "ProCable",
    "price": 4000000,
    "originalPrice": null,
    "images": [
      "/images/products/woocommerce-placeholder.png.webp"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Cáp mạng ProCable CAT3 (4 lõi cường lực) cuộn 500 mét",
    "tags": [
      "ProCable"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Hikvison Mini PT Smart Hybird Light 4MP DS-2DE2C400MWG-E - Cái",
    "slug": "camera-ip-hikvison-mini-pt-smart-hybird-light-4mp-ds-2de2c400mwg-e-cai",
    "sku": "camera-ip-hikvison-mini-pt-smart-hybird-light-4mp-ds-2de2c400mwg-e-cai",
    "brand": "Hikvision",
    "price": 1950000,
    "originalPrice": 2294000,
    "images": [
      "/images/products/thny_271d38ef40a685eab1112673e3407e72.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Camera IP Hikvison Mini PT Smart Hybird Light 4MP DS-2DE2C400MWG-E - Cái",
    "tags": [
      "Hikvision"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Wifi ngoài trời IMOU Cruiser SE+ S31FEP 2K 3MP",
    "slug": "camera-ip-wifi-ngoai-troi-imou-cruiser-se-s31fep-2k-3mp-cai",
    "sku": "camera-ip-wifi-ngoai-troi-imou-cruiser-se-s31fep-2k-3mp-cai",
    "brand": "Imou",
    "price": 1850000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_957f1baac6b1c852095efec14460a1bd.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera IP Wifi ngoài trời IMOU Cruiser SE+ S31FEP 2K 3MP",
    "tags": [
      "Imou"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Thẻ nhớ MicroSDXC Sandisk Ultra A1 512GB 150MB/s",
    "slug": "the-nho-microsdxc-sandisk-ultra-a1-512gb-150mb-s-the",
    "sku": "the-nho-microsdxc-sandisk-ultra-a1-512gb-150mb-s-the",
    "brand": "Sandisk",
    "price": 2500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_3227c50a15e0e177e479e4f8f3688b65.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Thẻ nhớ MicroSDXC Sandisk Ultra A1 512GB 150MB/s",
    "tags": [
      "Sandisk"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP VisionCop VSC-IP0940R-PDLK 4MP - Cái",
    "slug": "camera-ip-visioncop-vsc-ip0940r-pdlk-4mp-cai",
    "sku": "camera-ip-visioncop-vsc-ip0940r-pdlk-4mp-cai",
    "brand": "VisionCop",
    "price": 1200000,
    "originalPrice": 1412000,
    "images": [
      "/images/products/thny_1605f5ddd7d04c951b1854b8a035c9c1.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera IP VisionCop VSC-IP0940R-PDLK 4MP - Cái",
    "tags": [
      "VisionCop"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Visioncop VSC-IP0061R-PSSL 6MP - Cái",
    "slug": "camera-ip-visioncop-vsc-ip0061r-pssl-6mp-cai",
    "sku": "camera-ip-visioncop-vsc-ip0061r-pssl-6mp-cai",
    "brand": "Visioncop",
    "price": 3500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_401d7b522920b1719aabcdf2997de8fa.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Camera IP Visioncop VSC-IP0061R-PSSL 6MP - Cái",
    "tags": [
      "Visioncop"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Visioncop VSC-IP0061R-PSSD 6MP - Cái",
    "slug": "camera-ip-visioncop-vsc-ip0061r-pssd-6mp-cai",
    "sku": "camera-ip-visioncop-vsc-ip0061r-pssd-6mp-cai",
    "brand": "Visioncop",
    "price": 3990000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_2c4db499387cf352bca6721b44a3ebed.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera IP Visioncop VSC-IP0061R-PSSD 6MP - Cái",
    "tags": [
      "Visioncop"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Wifi PTZ Visioncop Full màu ban đêm VSC-IP00408RA-SLW 4MP - Cái",
    "slug": "camera-ip-wifi-visioncop-vsc-ip00408ra-slw-4mp-cai",
    "sku": "camera-ip-wifi-visioncop-vsc-ip00408ra-slw-4mp-cai",
    "brand": "Visioncop",
    "price": 2990000,
    "originalPrice": 3518000,
    "images": [
      "/images/products/thny_9dd894297bf99d77029bf158393ca9f6.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera IP Wifi PTZ Visioncop Full màu ban đêm VSC-IP00408RA-SLW 4MP - Cái",
    "tags": [
      "Visioncop"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Đầu ghi NVR AI VisionCop 10 kênh VS-NVR5110PS4K-S1 - Cái",
    "slug": "dau-ghi-nvr-ai-visioncop-10-kenh-vs-nvr5110ps4k-s1-cai",
    "sku": "dau-ghi-nvr-ai-visioncop-10-kenh-vs-nvr5110ps4k-s1-cai",
    "brand": "VisionCop",
    "price": 2800000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_13e8d2c2a38e1eaa194429d7cc402d95.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Đầu ghi NVR AI VisionCop 10 kênh VS-NVR5110PS4K-S1 - Cái",
    "tags": [
      "VisionCop"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Chân tripod Ugreen 15187 cho camera, điện thoại - Cái",
    "slug": "chan-tripod-ugreen-15187-cho-camera-dien-thoai-cai",
    "sku": "chan-tripod-ugreen-15187-cho-camera-dien-thoai-cai",
    "brand": "Ugreen",
    "price": 1100000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_8aad10009f58f26a9410a745be90bcdf.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Chân tripod Ugreen 15187 cho camera, điện thoại - Cái",
    "tags": [
      "Ugreen"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Wifi Skyworth H30P 3MP - Cái",
    "slug": "camera-ip-wifi-skyworth-h30p-3mp-cai",
    "sku": "camera-ip-wifi-skyworth-h30p-3mp-cai",
    "brand": "Skyworth",
    "price": 950000,
    "originalPrice": 1118000,
    "images": [
      "/images/products/thny_8437a222ae8696db5c300fc8fe72161a.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera IP Wifi Skyworth H30P 3MP - Cái",
    "tags": [
      "Skyworth"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Wifi Skyworth H30C 3MP - Cái",
    "slug": "camera-ip-wifi-skyworth-h30c-3mp-cai",
    "sku": "camera-ip-wifi-skyworth-h30c-3mp-cai",
    "brand": "Skyworth",
    "price": 950000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_3b496c59fcd036546aaa1486b1d49729.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera IP Wifi Skyworth H30C 3MP - Cái",
    "tags": [
      "Skyworth"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Wifi Skyworth SKH-I65B4S-4CWT 5MP - Cái",
    "slug": "camera-ip-wifi-skyworth-skh-i65b4s-4cwt-5mp-cai",
    "sku": "camera-ip-wifi-skyworth-skh-i65b4s-4cwt-5mp-cai",
    "brand": "Skyworth",
    "price": 2750000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_9aaed69378d05f3067d620b4ee2095ad.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera IP Wifi Skyworth SKH-I65B4S-4CWT 5MP - Cái",
    "tags": [
      "Skyworth"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Wifi Skyworth SKH-I63D4H2-4AWT 3MP - Cái",
    "slug": "camera-ip-wifi-skyworth-skh-i63d4h2-4awt-3mp-cai",
    "sku": "camera-ip-wifi-skyworth-skh-i63d4h2-4awt-3mp-cai",
    "brand": "Skyworth",
    "price": 1600000,
    "originalPrice": 1882000,
    "images": [
      "/images/products/thny_2eaffac73f687cd1b8a3f2b3fb63d16f.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": true,
    "shortDescription": "Camera IP Wifi Skyworth SKH-I63D4H2-4AWT 3MP - Cái",
    "tags": [
      "Skyworth"
    ]
  },
  {
    "catSlug": "camera-quan-sat",
    "name": "Camera IP Wifi Skyworth H40 4MP - Cái",
    "slug": "camera-ip-wifi-skyworth-h40-4mp-cai",
    "sku": "camera-ip-wifi-skyworth-h40-4mp-cai",
    "brand": "Skyworth",
    "price": 1350000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_b173697882ea2a842ac36049c61de2f1.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Camera IP Wifi Skyworth H40 4MP - Cái",
    "tags": [
      "Skyworth"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in laser đen trắng Kyocera ECOSYS PA4000x hiệu suất cao (A4/A5/Đảo mặt/USB/LAN) - Cái",
    "slug": "may-in-laser-den-trang-kyocera-ecosys-pa4000x-hieu-suat-cao-a4-a5-dao-mat-usb-lan-cai",
    "sku": "may-in-laser-den-trang-kyocera-ecosys-pa4000x-hieu-suat-cao-a4-a5-dao-mat-usb-lan-cai",
    "brand": "Kyocera",
    "price": 9990000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_577a26c5a70c4b673e2b0c05483e2944.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy in laser đen trắng Kyocera ECOSYS PA4000x hiệu suất cao (A4/A5/Đảo mặt/USB/LAN) - Cái",
    "tags": [
      "Kyocera"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in laser đen trắng đơn năng Pantum P2505W (In A4, USB, WIFI)",
    "slug": "may-in-laser-den-trang-don-nang-pantum-p2505w-in-a4-usb-wifi-cai",
    "sku": "may-in-laser-den-trang-don-nang-pantum-p2505w-in-a4-usb-wifi-cai",
    "brand": "Pantum",
    "price": 2950000,
    "originalPrice": 3471000,
    "images": [
      "/images/products/thny_f5691be17b446554a60a1c41f743fe24.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy in laser đen trắng đơn năng Pantum P2505W (In A4, USB, WIFI)",
    "tags": [
      "Pantum"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in đen trắng 2 mặt Pantum P3022D - Cái",
    "slug": "may-in-den-trang-2-mat-pantum-p3022d-cai",
    "sku": "may-in-den-trang-2-mat-pantum-p3022d-cai",
    "brand": "Pantum",
    "price": 3490000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_5d33bf8bf515b53f995fc338317e878a.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Máy in đen trắng 2 mặt Pantum P3022D - Cái",
    "tags": [
      "Pantum"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in Laser Laser đa chức năng Canon MF461dw (In, Copy, Scan, Wi-Fi, In 2 mặt tự động)",
    "slug": "may-in-laser-laser-da-chuc-nang-canon-mf461dw-in-copy-scan-wi-fi-in-2-mat-tu-dong-cai",
    "sku": "may-in-laser-laser-da-chuc-nang-canon-mf461dw-in-copy-scan-wi-fi-in-2-mat-tu-dong-cai",
    "brand": "Canon",
    "price": 11850000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_8d9a2726006c6686e75ce6d08474a886.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Máy in Laser Laser đa chức năng Canon MF461dw (In, Copy, Scan, Wi-Fi, In 2 mặt tự động)",
    "tags": [
      "Canon"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in Laser đen trắng HP 4003DN 2Z609A (A4, A5, in đảo mặt, USB, LAN)",
    "slug": "may-in-laser-den-trang-hp-4003dn-2z609a-a4-a5-in-dao-mat-usb-lan-cai",
    "sku": "may-in-laser-den-trang-hp-4003dn-2z609a-a4-a5-in-dao-mat-usb-lan-cai",
    "brand": "HP",
    "price": 8800000,
    "originalPrice": 10353000,
    "images": [
      "/images/products/thny_cba41659e8b1b4416a6813986aac611a.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy in Laser đen trắng HP 4003DN 2Z609A (A4, A5, in đảo mặt, USB, LAN)",
    "tags": [
      "HP"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in HP LaserJet Enterprise M406dn Printer 3PZ15A (In đảo mặt, A4, A5, USB, LAN) - Cái",
    "slug": "may-in-hp-laserjet-enterprise-m406dn-printer-3pz15a-in-dao-mat-a4-a5-usb-lan-cai",
    "sku": "may-in-hp-laserjet-enterprise-m406dn-printer-3pz15a-in-dao-mat-a4-a5-usb-lan-cai",
    "brand": "HP",
    "price": 8800000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_d5cdfeb595b46fb5af4374fd6e42ed82.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy in HP LaserJet Enterprise M406dn Printer 3PZ15A (In đảo mặt, A4, A5, USB, LAN) - Cái",
    "tags": [
      "HP"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in laser đen trắng đa năng Brother MFC-L2701D (In đảo mặt, Scan ADF 1 mặt, Copy, fax) - Cái",
    "slug": "may-in-laser-den-trang-da-nang-brother-mfc-l2701d-in-dao-mat-scan-adf-1-mat-copy-fax-cai",
    "sku": "may-in-laser-den-trang-da-nang-brother-mfc-l2701d-in-dao-mat-scan-adf-1-mat-copy-fax-cai",
    "brand": "Brother",
    "price": 6290000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_07e104630c859b8834774e3febfb211f.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Máy in laser đen trắng đa năng Brother MFC-L2701D (In đảo mặt, Scan ADF 1 mặt, Copy, fax) - Cái",
    "tags": [
      "Brother"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in Laser đa chức năng Canon MF241D (In/Copy/Scan/Đảo mặt/A4/A5/USB)",
    "slug": "may-in-laser-da-chuc-nang-canon-mf241d-in-scan-copy-dao-mat-cai",
    "sku": "may-in-laser-da-chuc-nang-canon-mf241d-in-scan-copy-dao-mat-cai",
    "brand": "Canon",
    "price": 6000000,
    "originalPrice": 7059000,
    "images": [
      "/images/products/thny_9d99cc043124af7af4369b6f6a96dac6.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy in Laser đa chức năng Canon MF241D (In/Copy/Scan/Đảo mặt/A4/A5/USB)",
    "tags": [
      "Canon"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in laser đen trắng 2 mặt HP LaserJet M211D (A4/ A5, USB)",
    "slug": "may-in-a4-hp-laser-jet-m211d-cai",
    "sku": "may-in-a4-hp-laser-jet-m211d-cai",
    "brand": "HP",
    "price": 3100000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_f24087b3db03d1f7cd22ca32dfb94bfd.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Máy in laser đen trắng 2 mặt HP LaserJet M211D (A4/ A5, USB)",
    "tags": [
      "HP"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in A3 laser đen trắng HP M706N (In| A3| A4| USB| LAN) - Cái",
    "slug": "may-in-a3-laser-den-trang-hp-m706n-in-a3-a4-usb-lan-cai",
    "sku": "may-in-a3-laser-den-trang-hp-m706n-in-a3-a4-usb-lan-cai",
    "brand": "HP",
    "price": 13000000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_e89ccfac46303c8a60694ad2dd43f3ef.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy in A3 laser đen trắng HP M706N (In| A3| A4| USB| LAN) - Cái",
    "tags": [
      "HP"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in laser đen trắng Canon MF264DW II - Cái",
    "slug": "may-in-laser-den-trang-canon-mf264dw-ii-cai",
    "sku": "may-in-laser-den-trang-canon-mf264dw-ii-cai",
    "brand": "Canon",
    "price": 11000000,
    "originalPrice": 12941000,
    "images": [
      "/images/products/thny_e58a541b74dabb8776828cd4b6e7afbb.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Máy in laser đen trắng Canon MF264DW II - Cái",
    "tags": [
      "Canon"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in laser đen trắng đa năng Ricoh SP 230SFNw (Wifi, in, copy, scan, fax) - Cái",
    "slug": "may-in-laser-ricoh-sp-230sfnw-da-nang-cai",
    "sku": "may-in-laser-ricoh-sp-230sfnw-da-nang-cai",
    "brand": "Ricoh",
    "price": 7900000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_483b572a9795ad1f3ff23b49a8896715.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy in laser đen trắng đa năng Ricoh SP 230SFNw (Wifi, in, copy, scan, fax) - Cái",
    "tags": [
      "Ricoh"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in Laser đen trắng Brother HL-L5210DW (Wifi, 2 mặt tự động) - Cái",
    "slug": "may-in-laser-trang-den-brother-hl-l5210dw-cai",
    "sku": "may-in-laser-trang-den-brother-hl-l5210dw-cai",
    "brand": "Brother",
    "price": 11500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_0ae27018917b970a55261a2b73024db1.png"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy in Laser đen trắng Brother HL-L5210DW (Wifi, 2 mặt tự động) - Cái",
    "tags": [
      "Brother"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in laser trắng đen đơn năng HP 108w - Cái",
    "slug": "may-in-laser-trang-den-don-nang-hp-108w-cai",
    "sku": "may-in-laser-trang-den-don-nang-hp-108w-cai",
    "brand": "HP",
    "price": 3490000,
    "originalPrice": 4106000,
    "images": [
      "/images/products/thny_a6900840af3a1f761900fe9cf7f0a3df.jpeg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": true,
    "shortDescription": "Máy in laser trắng đen đơn năng HP 108w - Cái",
    "tags": [
      "HP"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in đen trắng 2 mặt Pantum P3012D - Cái",
    "slug": "may-in-den-trang-2-mat-pantum-p3012d-cai",
    "sku": "may-in-den-trang-2-mat-pantum-p3012d-cai",
    "brand": "Pantum",
    "price": 3490000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_9b3672f6eb1a521347216dd305a97023.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": false,
    "shortDescription": "Máy in đen trắng 2 mặt Pantum P3012D - Cái",
    "tags": [
      "Pantum"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in laser đen trắng Canon LBP6030 (A4/A5/ USB)",
    "slug": "may-in-laser-den-trang-canon-lbp6030-a4-a5-usb-cai",
    "sku": "may-in-laser-den-trang-canon-lbp6030-a4-a5-usb-cai",
    "brand": "Canon",
    "price": 3450000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_15ce16602bb285868874d5a46c076685.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy in laser đen trắng Canon LBP6030 (A4/A5/ USB)",
    "tags": [
      "Canon"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in Laser đen trắng Pantum P3012DW (A4 | In đảo mặt | USB| WIFI) - Cái",
    "slug": "may-in-laser-den-trang-pantum-p3012dw-a4-in-dao-mat-usb-wifi",
    "sku": "may-in-laser-den-trang-pantum-p3012dw-a4-in-dao-mat-usb-wifi",
    "brand": "Pantum",
    "price": 3990000,
    "originalPrice": 4694000,
    "images": [
      "/images/products/thny_fb1b391de9ee5eb3f8ee58e66590c2b9.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy in Laser đen trắng Pantum P3012DW (A4 | In đảo mặt | USB| WIFI) - Cái",
    "tags": [
      "Pantum"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in laser đen trắng đơn năng Pantum P2516 - Cái",
    "slug": "may-in-laser-den-trang-don-nang-pantum-p2516",
    "sku": "may-in-laser-den-trang-don-nang-pantum-p2516",
    "brand": "Pantum",
    "price": 2500000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_b52254d245ff55c415ea357e987e234e.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy in laser đen trắng đơn năng Pantum P2516 - Cái",
    "tags": [
      "Pantum"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in laser đen trắng PANTUM M6702DW (A4/A5/In/Copy/Scan/ Đảo mặt/USB/ WIFI) - Cái",
    "slug": "may-in-laser-den-trang-pantum-m6702dw-a4-a5-in-copy-scan-dao-mat-usb-wifi",
    "sku": "may-in-laser-den-trang-pantum-m6702dw-a4-a5-in-copy-scan-dao-mat-usb-wifi",
    "brand": "Pantum",
    "price": 4890000,
    "originalPrice": null,
    "images": [
      "/images/products/thny_d2f1faee17a5a6599019f18eee642c88.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": true,
    "isNewProduct": true,
    "shortDescription": "Máy in laser đen trắng PANTUM M6702DW (A4/A5/In/Copy/Scan/ Đảo mặt/USB/ WIFI) - Cái",
    "tags": [
      "Pantum"
    ]
  },
  {
    "catSlug": "may-in",
    "name": "Máy in đen trắng 2 mặt Pantum P3010D - Cái",
    "slug": "may-in-den-trang-2-mat-pantum-p3010d",
    "sku": "may-in-den-trang-2-mat-pantum-p3010d",
    "brand": "Pantum",
    "price": 3490000,
    "originalPrice": 4106000,
    "images": [
      "/images/products/thny_0a6837b4526982732e3c5bbfe64b7319.jpg"
    ],
    "stock": 10,
    "isActive": true,
    "isFeatured": false,
    "isNewProduct": false,
    "shortDescription": "Máy in đen trắng 2 mặt Pantum P3010D - Cái",
    "tags": [
      "Pantum"
    ]
  }
];

const router = Router();

router.post('/seed', async (req: Request, res: Response): Promise<void> => {
  // Seed performs destructive DELETEs. Require an explicit opt-in, a strong
  // shared secret header and a separately supplied admin password.
  const seedSecret = process.env.DEV_SEED_SECRET || '';
  const suppliedSecret = req.get('x-seed-secret') || '';
  const secretA = Buffer.from(seedSecret);
  const secretB = Buffer.from(suppliedSecret);
  const secretMatches = secretA.length >= 32 && secretA.length === secretB.length
    && crypto.timingSafeEqual(secretA, secretB);
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD || '';

  if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEV_SEED !== 'true'
    || !secretMatches || seedAdminPassword.length < 12) {
    res.status(404).json({ message: 'Seed endpoint không khả dụng hoặc chưa được cấu hình an toàn.' });
    return;
  }

  try {
    // 1. Xóa dữ liệu cũ theo đúng thứ tự FK
    await prisma.shippingTrackingHistory.deleteMany();
    await prisma.orderStatusHistory.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.review.deleteMany();
    await prisma.pcBuildComponent.deleteMany();
    await prisma.pcBuild.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.productSpec.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.address.deleteMany();
    await prisma.user.deleteMany();
    await prisma.banner.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.post.deleteMany();

    // 2. Tạo danh mục
    const [catPC, catCam, catIn] = await Promise.all([
      prisma.category.create({ data: { name: 'Máy tính & PC',    slug: 'may-tinh-pc',     description: 'Máy tính để bàn, Mini PC, All-in-One' } satisfies Prisma.CategoryUncheckedCreateInput }),
      prisma.category.create({ data: { name: 'Camera quan sát', slug: 'camera-quan-sat', description: 'Camera IP, Wifi, PTZ, đầu ghi NVR' } satisfies Prisma.CategoryUncheckedCreateInput }),
      prisma.category.create({ data: { name: 'Máy in',          slug: 'may-in',          description: 'Máy in laser, đa năng, in 2 mặt' } satisfies Prisma.CategoryUncheckedCreateInput }),
    ]);

    const catMap: Record<SeedCategorySlug, string> = {
      'may-tinh-pc':     catPC.id,
      'camera-quan-sat': catCam.id,
      'may-in':          catIn.id,
    };

    // 3. Seed 117 sản phẩm thật
    let total = 0;
    for (const p of PRODUCTS_DATA) {
      const { catSlug, ...data } = p;
      const productInput: Prisma.ProductUncheckedCreateInput = { ...data, categoryId: catMap[catSlug] };
      await prisma.product.create({ data: productInput });
      total++;
    }

    // 4. Admin user
    const hashed = await bcrypt.hash(seedAdminPassword, 12);
    const adminInput: Prisma.UserUncheckedCreateInput = {
      fullName: 'Quản trị viên', email: 'admin@cuahangmaytinh.vn', password: hashed, phone: '0934444369', role: 'admin',
    };
    await prisma.user.create({ data: adminInput });

    // 5. SiteSettings mặc định
    if (await prisma.siteSettings.count() === 0) {
      await prisma.siteSettings.create({ data: {} satisfies Prisma.SiteSettingsUncheckedCreateInput });
    }

    res.json({ success: true, message: 'Seed PostgreSQL thành công!', data: { categories: 3, products: total, admin: 'admin@cuahangmaytinh.vn' } });
  } catch (err) {
    console.error('❌ Seed error:', err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
