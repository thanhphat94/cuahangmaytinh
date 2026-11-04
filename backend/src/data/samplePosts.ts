/**
 * Tin tức mẫu — dùng cho nút "Nhập tin mẫu" ở trang Admin → Tin tức.
 * Nội dung dùng định dạng đơn giản: dòng bắt đầu bằng "## " là tiêu đề nhỏ,
 * dòng bắt đầu bằng "- " là gạch đầu dòng, các dòng còn lại là đoạn văn.
 */
export type SamplePost = {
  title: string;
  thumbnail: string;
  /** Ngày đăng (YYYY-MM-DD). */
  date: string;
  content: string;
};

export const SAMPLE_POSTS: SamplePost[] = [
  {
    "title": "Hikvision ra mắt camera AI ColorVu 2026 – Nhận diện xe và màu sắc cực chính xác",
    "thumbnail": "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&h=300&fit=crop",
    "date": "2026-06-10",
    "content": "Hikvision vừa chính thức ra mắt dòng camera thế hệ mới tích hợp công nghệ AI ColorVu 2026, mang lại khả năng nhận diện và phân tích hình ảnh vượt trội so với các thế hệ trước.\n## Công nghệ ColorVu tiên tiến\nDòng camera sử dụng cảm biến F1.0 kết hợp với chip xử lý AI thế hệ mới, cho phép ghi hình màu rõ nét ngay cả trong điều kiện ánh sáng cực kỳ thấp (0.0005 lux).\n## Tính năng AI nổi bật\n- Nhận diện biển số xe tự động (ANPR) với độ chính xác 97%\n- Phân tích màu sắc phương tiện theo thời gian thực\n- Phát hiện xâm nhập, vượt ranh giới ảo\n- Nhận diện khuôn mặt với cơ sở dữ liệu 10.000 người\n- Cảnh báo đám đông thông minh\n## Thông số kỹ thuật\nCamera có độ phân giải 4K (8MP), lens varifocal 2.8-12mm, hỗ trợ chuẩn H.265+ tiết kiệm băng thông tới 75% so với H.264. Chống nước chuẩn IP67, chịu nhiệt từ -30°C đến 60°C.\nSản phẩm hiện đã có mặt tại Cửa Hàng Máy Tính với mức giá cạnh tranh và chế độ bảo hành 24 tháng chính hãng."
  },
  {
    "title": "Top 5 máy in laser tốt nhất 2026 – So sánh Canon, HP, Pantum, Brother",
    "thumbnail": "https://images.unsplash.com/photo-1612815154858-60aa4c43e64e?w=600&h=300&fit=crop",
    "date": "2026-06-08",
    "content": "Máy in laser ngày càng trở thành thiết bị không thể thiếu trong văn phòng và hộ gia đình. Chúng tôi đã test 5 mẫu bán chạy nhất 2026 để giúp bạn chọn đúng sản phẩm phù hợp nhu cầu.\n## 1. Canon MF264DW II – Tốt nhất tổng thể\nTốc độ 29 trang/phút, in 2 mặt tự động, wifi tích hợp. Chi phí mực khoảng 350đ/trang. Phù hợp văn phòng vừa và nhỏ.\n## 2. HP LaserJet M211D – Giá rẻ nhất phân khúc\nTốc độ 30 trang/phút, in 2 mặt, kết nối USB. Giá chỉ 3.1 triệu đồng. Chi phí mực 400đ/trang – phù hợp hộ gia đình.\n## 3. Pantum P3012DW – Đáng tiền nhất\nWifi + in 2 mặt ở mức giá 3.9 triệu. Hộp mực rẻ nhất phân khúc chỉ 250đ/trang. Thương hiệu ngày càng được tin dùng tại Việt Nam.\n## 4. Brother MFC-L2701D – Đa năng nhất\nIn/Copy/Scan/Fax. Tốc độ scan ADF 1 mặt nhanh. Phù hợp kế toán, văn phòng cần đa năng.\n## 5. Kyocera ECOSYS PA4000x – Tiết kiệm mực nhất\nThiết kế mực nạp trực tiếp, chi phí chỉ 80đ/trang. Tuổi thọ máy 500.000 trang. Lý tưởng cho doanh nghiệp in số lượng lớn."
  },
  {
    "title": "Intel Core Ultra 200 (Arrow Lake) – Đánh giá hiệu năng thực tế",
    "thumbnail": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=300&fit=crop",
    "date": "2026-06-05",
    "content": "Intel Core Ultra 200 (Arrow Lake) chính thức lên kệ và chúng tôi đã có cơ hội test thực tế bộ xử lý mới nhất này trong các tác vụ văn phòng lẫn xử lý đồ họa.\n## Kiến trúc mới hoàn toàn\nArrow Lake sử dụng node sản xuất Intel 20A với kiến trúc tiled chiplet, tách biệt nhân P-core và E-core thành các die riêng biệt kết nối qua Foveros Direct 3D stacking.\n## Kết quả benchmark\n- Cinebench R24 Single: tăng 12% so với i9-14900K\n- Blender: ngang ngửa AMD Ryzen 9 9950X\n- TDP: chỉ 125W so với 253W của thế hệ trước\n- Nhiệt độ tối đa: 85°C dưới load tối đa\n## Phù hợp cho ai?\nVới mức giá dự kiến 8-15 triệu cho các chip Core Ultra 9/7/5, đây là lựa chọn xuất sắc cho workstation build mới 2026, đặc biệt với hỗ trợ DDR5-6400 gốc."
  },
  {
    "title": "Hướng dẫn lắp đặt camera IP đầy đủ cho người mới bắt đầu",
    "thumbnail": "https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?w=600&h=300&fit=crop",
    "date": "2026-06-02",
    "content": "Lắp đặt camera tự giám sát tại nhà không còn khó nếu bạn có hướng dẫn chi tiết. Bài viết này sẽ dẫn dắt bạn qua từng bước từ A đến Z.\n## Bước 1: Chọn loại camera phù hợp\nCamera IP qua dây mạng (PoE): Ổn định, hình ảnh sắc nét, cần kéo dây Cat6. Phù hợp lắp cố định lâu dài.\nCamera Wifi: Dễ lắp, không cần kéo dây. Phù hợp cho thuê nhà hoặc cần di chuyển.\n## Bước 2: Lên sơ đồ lắp đặt\n- Xác định vị trí cần quan sát: cổng ra vào, kho, nhà xe\n- Đảm bảo góc camera bao phủ đủ diện tích\n- Kiểm tra nguồn điện và đường kéo dây\n## Bước 3: Lắp đặt và cấu hình NVR\nKết nối camera qua switch PoE vào NVR. Cấu hình lịch ghi hình liên tục hoặc chỉ ghi khi có chuyển động để tiết kiệm dung lượng ổ cứng.\n## Bước 4: Xem từ xa qua điện thoại\nTải app Hik-Connect (Hikvision), DMSS (Dahua) hoặc EZView (Uniarch). Quét mã QR trên thiết bị để kết nối ngay lập tức.\nLưu ý: Để xem từ xa ổn định, nên dùng đường truyền internet tối thiểu 10 Mbps upload."
  },
  {
    "title": "AMD Ryzen 9000 series (Zen 5) – Hiệu năng bứt phá mới",
    "thumbnail": "https://images.unsplash.com/photo-1555617981-dac3772e4783?w=600&h=300&fit=crop",
    "date": "2026-05-28",
    "content": "AMD tiếp tục thống trị phân khúc hiệu năng với dòng Ryzen 9000 series (Zen 5), mang lại bước nhảy vọt về IPC so với thế hệ Zen 4 trước đó.\n## Kiến trúc Zen 5 – Những điểm mới\nZen 5 được sản xuất trên node TSMC N3E, tăng IPC trung bình 16% trong các tác vụ thực tế. Chip đầu bảng Ryzen 9 9950X có 16 nhân 32 luồng, clock tối đa 5.7 GHz.\n## Thông số nổi bật\n- Ryzen 9 9950X: 16C/32T, 5.7GHz boost, TDP 170W\n- Ryzen 7 9700X: 8C/16T, 5.5GHz boost, TDP 65W\n- Ryzen 5 9600X: 6C/12T, 5.4GHz boost, TDP 65W\n## So sánh với Intel\nTrong đa số benchmark sáng tạo nội dung (Blender, DaVinci Resolve), Ryzen 9000 vượt trội Intel Core Ultra 200 từ 8-15%. Tuy nhiên Intel vẫn dẫn trước trong gaming single-thread."
  },
  {
    "title": "Cửa Hàng Máy Tính – Khuyến mãi tháng 6/2026: Giảm đến 30%",
    "thumbnail": "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&h=300&fit=crop",
    "date": "2026-06-01",
    "content": "Cửa Hàng Máy Tính tổ chức chương trình khuyến mãi tri ân khách hàng tháng 6/2026 với hàng trăm sản phẩm giảm giá từ 15-30%, áp dụng cho cả mua online và tại cửa hàng.\n## Các sản phẩm được ưu đãi\n- Camera an ninh: Hikvision, Dahua, Uniarch – giảm 20-30%\n- Máy in: Pantum, Canon, HP – giảm 15-25%\n- Máy tính văn phòng: Dell, HP, Lenovo – giảm 10-20%\n## Chính sách ưu đãi thêm\nFreeship toàn quốc cho đơn hàng từ 500K. Lắp đặt miễn phí tận nơi trong bán kính 20km tại TP.HCM. Bảo hành tại nhà 24 tháng cho camera và máy tính.\nChương trình áp dụng từ ngày 01/06 đến hết 30/06/2026."
  }
];
