/**
 * 自主檢查表「🖼 看圖說」：檢查項目的示意圖與說明（填表時參考用，列印／PDF 不會印出）
 *   window.SK_GUIDES[範本編號][項目序號] = { svg, zh: [說明…], vi: [giải thích…] }
 * 示意圖用簡單線條畫（檔案小、手機看得清楚）；數值以表格上的「規定標準」為準（工地可修改），
 * 圖上只標名稱與符號。越南文為 AI 翻譯，待人工核對。
 * 目前有：01 放樣、07 柱鋼筋、09 梁鋼筋、10 板鋼筋、14 施工架、38 土方開挖、48 水平支撐
 */
(function () {
  /* ---------- 畫圖小工具（座標以 400 × H 為準） ---------- */
  const svg = (body, h = 240) =>
    `<svg class="gd-svg" viewBox="0 0 400 ${h}" xmlns="http://www.w3.org/2000/svg" role="img">${body}</svg>`;
  const t = (x, y, s, cls = '', anchor = 'middle') =>
    `<text x="${x}" y="${y}" class="gd-t ${cls}" text-anchor="${anchor}">${s}</text>`;
  const line = (x1, y1, x2, y2, cls) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
  const rect = (x, y, w, h, cls) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`;
  const dot = (x, y, r = 4, cls = 'gd-bar-dot') => `<circle cx="${x}" cy="${y}" r="${r}" class="${cls}"/>`;
  // 尺寸線：兩端斜短線（工程圖常用的標註方式）
  const tick = (x, y) => line(x - 4, y + 4, x + 4, y - 4, 'gd-dim');
  const dimH = (x1, x2, y, label, dy = -6) =>
    line(x1, y, x2, y, 'gd-dim') + tick(x1, y) + tick(x2, y) + t((x1 + x2) / 2, y + dy, label, 'gd-dimt');
  const dimV = (x, y1, y2, label, side = 'right') =>
    line(x, y1, x, y2, 'gd-dim') + tick(x, y1) + tick(x, y2) +
    t(side === 'right' ? x + 6 : x - 6, (y1 + y2) / 2 + 4, label, 'gd-dimt', side === 'right' ? 'start' : 'end');
  // 軸線（灰色長短虛線）＋軸號圓圈
  const axisV = (x, y1, y2, no) => line(x, y1, x, y2, 'gd-axis') + `<circle cx="${x}" cy="${y1 - 11}" r="10" class="gd-bubble"/>` + t(x, y1 - 7, no, 'gd-bt');
  const axisH = (y, x1, x2, no) => line(x1, y, x2, y, 'gd-axis') + `<circle cx="${x1 - 11}" cy="${y}" r="10" class="gd-bubble"/>` + t(x1 - 11, y + 4, no, 'gd-bt');
  const ok = (x, y, s) => t(x, y, '✔ ' + s, 'gd-ok', 'start');

  /* ---------- 01 放樣 ---------- */
  const sheet = (x, title) =>
    rect(x, 30, 160, 130, 'gd-paper') + t(x + 80, 22, title, 'gd-b') +
    line(x + 45, 40, x + 45, 150, 'gd-axis') + line(x + 120, 40, x + 120, 150, 'gd-axis') +
    line(x + 10, 70, x + 150, 70, 'gd-axis') + line(x + 10, 130, x + 150, 130, 'gd-axis') +
    [[45, 70], [120, 70], [45, 130], [120, 130]].map(([a, b]) => rect(x + a - 7, b - 7, 14, 14, 'gd-col')).join('') +
    t(x + 45, 50, '①', 'gd-s') + t(x + 120, 50, '②', 'gd-s') + t(x + 22, 66, 'Ⓐ', 'gd-s') + t(x + 22, 126, 'Ⓑ', 'gd-s');

  const G01 = {
    0: {
      svg: svg(sheet(20, '結構圖／建築圖') + sheet(220, '放樣圖') +
        t(200, 100, '⇄', 'gd-big') + t(200, 120, '核對', 'gd-s') +
        ok(30, 190, '軸線編號、軸線間距') + ok(220, 190, '柱、梁、牆的尺寸') +
        ok(30, 215, '開口、降板位置') + ok(220, 215, '有出入先問清楚再放樣')),
      zh: ['放樣圖要和結構圖、建築圖逐項對過：軸線編號、間距、柱梁牆尺寸、開口與降板位置。',
        '圖面互相不一致時，先請設計單位確認，不要在現場自己決定。'],
      vi: ['Đối chiếu bản vẽ định vị với bản vẽ kết cấu, kiến trúc: số trục, khoảng cách trục, kích thước cột, dầm, vách, vị trí lỗ mở và sàn hạ cốt.',
        'Nếu các bản vẽ không khớp, hỏi đơn vị thiết kế trước, không tự quyết định tại hiện trường.'],
    },
    1: {
      svg: svg(axisV(100, 40, 200, '①') + axisV(300, 40, 200, '②') + axisH(140, 40, 370, 'Ⓐ') +
        line(130, 40, 130, 200, 'gd-ctrl') + line(330, 40, 330, 200, 'gd-ctrl') + line(40, 170, 370, 170, 'gd-ctrl') +
        t(134, 56, '控制線（逃線）', 'gd-g', 'start') +
        line(100, 140, 300, 170, 'gd-diag') + line(300, 140, 100, 170, 'gd-diag') +
        dimH(100, 300, 100, '軸線間距：實測 − 設計 ≦ 誤差') +
        t(200, 226, '交叉點對角線等長 → 角度是直角', 'gd-s')),
      zh: ['每條基準軸線另外彈一條平行的控制線（逃線），柱牆模板蓋住軸線後還能量測。',
        '用鋼捲尺拉直量兩條基準線的距離，和圖面相差不超過規定標準。',
        '量兩條對角線是否等長，確認十字線互相垂直。'],
      vi: ['Mỗi trục chuẩn bật thêm một đường kiểm tra song song (đường lui), để khi ván khuôn che trục vẫn đo được.',
        'Kéo thẳng thước thép đo khoảng cách giữa hai đường chuẩn, chênh lệch so với bản vẽ không vượt tiêu chuẩn.',
        'Đo hai đường chéo có bằng nhau không để xác nhận các đường chữ thập vuông góc.'],
    },
    2: {
      svg: svg(rect(30, 205, 340, 14, 'gd-con') + rect(30, 120, 340, 12, 'gd-con') + rect(30, 40, 340, 12, 'gd-con') +
        rect(250, 120, 30, 12, 'gd-hole') + rect(250, 40, 30, 12, 'gd-hole') +
        line(265, 205, 265, 30, 'gd-laser') + `<path d="M255 219 L265 205 L275 219 Z" class="gd-tri"/>` +
        t(290, 232, 'BM 高程基準點', 'gd-s', 'start') + t(290, 148, '← 樓板預留引點孔', 'gd-s', 'start') +
        rect(70, 132, 22, 73, 'gd-col') + rect(70, 52, 22, 68, 'gd-col') +
        line(60, 172, 130, 172, 'gd-mark') + line(60, 92, 130, 92, 'gd-mark') +
        t(136, 176, '1FL+100cm 水平線', 'gd-r', 'start') + t(136, 96, '2FL+100cm 水平線', 'gd-r', 'start') +
        t(200, 20, '每層從同一基準點引上來，不要一層一層往上累加', 'gd-s')),
      zh: ['高程從固定的 BM 基準點，經樓板預留的引點孔用雷射或水準儀垂直引上。',
        '每層引上來後在柱、牆彈「樓板面＋100cm」水平線，和設計高程相差不超過規定標準。',
        '每層都從同一個基準引，不要從下一層再往上量，誤差才不會累積。'],
      vi: ['Cao độ dẫn từ điểm chuẩn BM cố định, qua lỗ chờ trên sàn bằng máy laser hoặc máy thủy bình theo phương đứng.',
        'Mỗi tầng bật đường ngang "mặt sàn +100cm" trên cột, vách; chênh lệch với cao độ thiết kế không vượt tiêu chuẩn.',
        'Tầng nào cũng dẫn từ cùng một điểm chuẩn, không đo tiếp từ tầng dưới để sai số không cộng dồn.'],
    },
    3: {
      svg: svg(axisV(200, 40, 210, '①') + axisH(125, 60, 350, 'Ⓐ') +
        rect(165, 95, 70, 60, 'gd-col') + rect(130, 60, 140, 130, 'gd-check') +
        dimH(165, 235, 86, 'b') + dimV(246, 95, 155, 'h') +
        dimH(165, 200, 172, 'a', 14) +
        t(200, 210, '檢查線：柱邊外 30cm（模板封住後仍可量）', 'gd-g') +
        t(200, 232, 'a：柱邊到軸線　b × h：柱斷面', 'gd-s')),
      zh: ['柱子以軸線定位：量柱邊到軸線的距離（圖上 a），以及斷面尺寸 b × h。',
        '柱邊外另彈檢查線（例如 30cm），模板組立後量檢查線到模板的距離。',
        '位置與尺寸誤差都不超過規定標準。'],
      vi: ['Cột định vị theo trục: đo khoảng cách từ mép cột đến trục (a trên hình) và kích thước tiết diện b × h.',
        'Bật thêm đường kiểm tra ngoài mép cột (ví dụ 30cm), sau khi lắp ván khuôn thì đo từ đường kiểm tra đến ván khuôn.',
        'Sai số vị trí và kích thước đều không vượt tiêu chuẩn.'],
    },
    4: {
      svg: svg(axisH(110, 50, 370, 'Ⓐ') + axisV(80, 40, 210, '①') +
        rect(50, 98, 280, 26, 'gd-col') + line(50, 160, 330, 160, 'gd-ctrl') +
        dimV(340, 98, 124, '牆厚 t') + dimV(300, 124, 160, '30cm', 'left') +
        t(210, 180, '檢查線（牆邊外 30cm）', 'gd-g') +
        t(210, 80, '牆中心線或牆邊對軸線，依放樣圖', 'gd-s')),
      zh: ['依放樣圖確認牆是「中心對軸線」或「牆邊對軸線」，量牆邊到軸線的距離和牆厚。',
        '牆邊外彈檢查線，模板組立後用來確認位置。'],
      vi: ['Theo bản vẽ định vị xác nhận vách "tim trùng trục" hay "mép trùng trục", đo khoảng cách từ mép vách đến trục và chiều dày vách.',
        'Bật đường kiểm tra ngoài mép vách để kiểm tra vị trí sau khi lắp ván khuôn.'],
    },
    5: {
      svg: svg(axisH(125, 40, 370, 'Ⓐ') + axisV(80, 40, 210, '①') + axisV(320, 40, 210, '②') +
        rect(60, 100, 40, 50, 'gd-col') + rect(300, 100, 40, 50, 'gd-col') +
        line(100, 110, 300, 110, 'gd-beam') + line(100, 140, 300, 140, 'gd-beam') +
        dimV(200, 110, 140, '梁寬 b') + t(200, 175, '梁邊線畫在柱筋或底模上', 'gd-s') +
        t(200, 200, '梁深 d 以底模高程確認（樓板面往下量）', 'gd-s')),
      zh: ['梁的位置依軸線放出梁邊線，量梁寬 b、梁邊到軸線的距離。',
        '梁深在底模組立後，從樓板面高程往下量到底模確認。'],
      vi: ['Vị trí dầm bật đường mép dầm theo trục, đo bề rộng dầm b và khoảng cách từ mép dầm đến trục.',
        'Chiều cao dầm: sau khi lắp ván đáy, đo từ cao độ mặt sàn xuống đến ván đáy.'],
    },
    6: {
      svg: svg(rect(40, 90, 50, 110, 'gd-con') + rect(310, 90, 50, 110, 'gd-con') + rect(40, 90, 320, 30, 'gd-con') +
        line(30, 90, 370, 90, 'gd-mark') + t(200, 80, '板面高程線（彈在柱筋或模板上）', 'gd-r') +
        dimV(200, 90, 120, '板厚 t') + t(65, 165, '梁', 'gd-s') + t(335, 165, '梁', 'gd-s') +
        t(200, 225, '澆置時用標尺、插竿檢查厚度', 'gd-s')),
      zh: ['依圖確認板厚 t（填在表上），並在柱筋或模板上標出板面高程。',
        '澆置混凝土時用標尺或插竿抽查厚度，誤差不超過規定標準。'],
      vi: ['Xác nhận chiều dày sàn t theo bản vẽ (ghi vào phiếu), đánh dấu cao độ mặt sàn trên thép cột hoặc ván khuôn.',
        'Khi đổ bê tông dùng thước hoặc que cắm kiểm tra chiều dày, sai số không vượt tiêu chuẩn.'],
    },
    7: {
      svg: svg(rect(40, 30, 320, 170, 'gd-wall') + rect(150, 70, 120, 75, 'gd-hole') + line(30, 200, 370, 200, 'gd-floor') +
        dimH(150, 270, 60, '開口寬 W') + dimV(280, 70, 145, '開口高 H') + dimV(140, 145, 200, '台度', 'left') +
        t(380, 214, 'FL 樓板面', 'gd-s', 'end') +
        t(200, 230, '開口位置與台度用墨線畫在樓板上', 'gd-r')),
      zh: ['門窗開口的寬 W、高 H，以及台度（樓板面到窗台的高度）都要依圖標示在樓板上。',
        '組模前用來確認開口位置，誤差不超過規定標準。'],
      vi: ['Bề rộng W, chiều cao H của lỗ cửa và độ cao bệ cửa sổ (từ mặt sàn đến bệ) phải đánh dấu trên sàn theo bản vẽ.',
        'Dùng để xác nhận vị trí lỗ mở trước khi lắp ván khuôn, sai số không vượt tiêu chuẩn.'],
    },
    8: {
      svg: svg(`<path d="M50 200 L50 175 L95 175 L95 150 L140 150 L140 125 L185 125 L185 100 L230 100 L230 75 L340 75 L340 200 Z" class="gd-con"/>` +
        dimV(130, 150, 125, '級高 R', 'left') + dimH(140, 185, 115, '級深 T') +
        line(50, 200, 230, 75, 'gd-diag') + t(260, 150, '每一階 R、T 要一樣', 'gd-s', 'start') +
        t(260, 172, '梯寬 W 在平面上量', 'gd-s', 'start') + t(200, 226, '第一階與最後一階最容易做錯，要特別量', 'gd-r')),
      zh: ['依圖確認級高 R、級深 T、梯寬 W（填在表上），每一階都要一樣。',
        '第一階和最後一階要扣掉地坪、面材的厚度，最容易出錯，要特別量。'],
      vi: ['Xác nhận chiều cao bậc R, chiều sâu bậc T, chiều rộng thang W theo bản vẽ (ghi vào phiếu); các bậc phải đều nhau.',
        'Bậc đầu và bậc cuối phải trừ chiều dày lớp hoàn thiện, dễ sai nhất, cần đo kỹ.'],
    },
  };

  /* ---------- 10 板鋼筋 ---------- */
  const ribs = (x1, x2, y) => {
    let s = line(x1, y, x2, y, 'gd-bar');
    for (let x = x1 + 8; x < x2; x += 12) s += line(x, y - 5, x + 4, y + 5, 'gd-rib');
    return s;
  };
  const G10 = {
    0: {
      svg: svg(dot(80, 70, 13, 'gd-bar-cut') + dot(200, 70, 16, 'gd-bar-cut') + dot(320, 70, 19, 'gd-bar-cut') +
        t(80, 115, '#4（D13）', 'gd-b') + t(200, 115, '#5（D16）', 'gd-b') + t(320, 115, '#6（D19）', 'gd-b') +
        ribs(40, 360, 165) + t(200, 150, 'SD420  #5  廠牌記號', 'gd-r') +
        t(200, 195, '鋼筋上的軋印：強度、號數、廠牌', 'gd-s') + t(200, 220, '與進料單、試驗報告核對', 'gd-s')),
      zh: ['依圖確認板筋號數，現場看鋼筋上的軋印（強度、號數、廠牌）。',
        '軋印要和進料單、材料試驗報告一致；號數不同的鋼筋分開堆放，避免拿錯。'],
      vi: ['Xác nhận số hiệu thép sàn theo bản vẽ, kiểm tra ký hiệu cán trên thanh thép (cường độ, số hiệu, nhà sản xuất).',
        'Ký hiệu phải khớp với phiếu nhập hàng và báo cáo thí nghiệm; thép khác số hiệu để riêng tránh lấy nhầm.'],
    },
    1: {
      svg: svg(rect(250, 50, 90, 160, 'gd-con') + rect(20, 50, 230, 45, 'gd-con') +
        t(295, 190, '梁', 'gd-s') + t(120, 115, '板', 'gd-s') +
        line(20, 62, 325, 62, 'gd-bar') + line(325, 62, 325, 100, 'gd-bar') +
        line(20, 84, 310, 84, 'gd-bar') +
        dimH(250, 310, 135, '錨定長度', 14) + line(250, 95, 250, 140, 'gd-dimx') + line(310, 84, 310, 140, 'gd-dimx') +
        t(200, 30, '板筋伸入梁內，從梁邊起算', 'gd-r')),
      zh: ['板筋伸進支承的梁（或牆）裡，從梁邊量起的長度不少於規定的錨定長度。',
        '長度依號數不同（見規定標準），上層筋端部依圖彎鉤。'],
      vi: ['Thép sàn neo vào dầm (hoặc vách) đỡ, chiều dài tính từ mép dầm không nhỏ hơn chiều dài neo quy định.',
        'Chiều dài khác nhau theo số hiệu (xem tiêu chuẩn); đầu thép lớp trên bẻ móc theo bản vẽ.'],
    },
    2: {
      svg: svg(line(30, 70, 250, 70, 'gd-bar') + line(150, 80, 370, 80, 'gd-bar2') +
        dimH(150, 250, 52, '搭接長度') + line(150, 58, 150, 80, 'gd-dimx') + line(250, 58, 250, 70, 'gd-dimx') +
        line(30, 145, 170, 145, 'gd-bar') + line(120, 152, 370, 152, 'gd-bar2') +
        line(30, 175, 280, 175, 'gd-bar') + line(230, 182, 370, 182, 'gd-bar2') +
        line(30, 205, 170, 205, 'gd-bar') + line(120, 212, 370, 212, 'gd-bar2') +
        t(200, 130, '相鄰鋼筋的搭接位置要錯開', 'gd-r') + t(200, 235, '一般：上層筋在跨中搭接、下層筋在支承附近搭接（依圖）', 'gd-s')),
      zh: ['兩支鋼筋重疊的長度不少於規定的搭接長度（依號數）。',
        '相鄰鋼筋的搭接位置要錯開，不要全部集中在同一斷面；搭接位置依設計圖說。'],
      vi: ['Đoạn chồng lên nhau của hai thanh thép không nhỏ hơn chiều dài nối chồng quy định (theo số hiệu).',
        'Vị trí nối của các thanh liền kề phải so le, không dồn vào cùng một mặt cắt; vị trí nối theo bản vẽ thiết kế.'],
    },
    3: {
      svg: svg(rect(20, 30, 170, 170, 'gd-paper') +
        [50, 80, 110, 140, 170].map(x => line(x, 35, x, 195, 'gd-bar')).join('') +
        [55, 85, 115, 145, 175].map(y => line(25, y, 185, y, 'gd-bar2')).join('') +
        dimH(50, 80, 22, '間距 @') + t(105, 222, '平面：雙向排列', 'gd-s') +
        rect(220, 70, 160, 80, 'gd-con') +
        line(225, 88, 375, 88, 'gd-bar') + [245, 275, 305, 335, 365].map(x => dot(x, 95)).join('') +
        line(225, 132, 375, 132, 'gd-bar') + [245, 275, 305, 335, 365].map(x => dot(x, 125)).join('') +
        t(300, 62, '上層筋', 'gd-r') + t(300, 170, '下層筋', 'gd-r') + t(300, 222, '斷面：雙層雙向', 'gd-s')),
      zh: ['依圖確認「雙層雙向」：上層、下層各有兩個方向的鋼筋。',
        '用捲尺量間距（例如 @10、@20cm），連續量幾格取平均，不要只量一格。',
        '短向筋、長向筋誰在外側依設計圖說。'],
      vi: ['Xác nhận "2 lớp 2 phương" theo bản vẽ: lớp trên và lớp dưới đều có thép theo hai phương.',
        'Dùng thước đo khoảng cách (ví dụ @10, @20cm), đo liên tiếp vài ô lấy trung bình, không chỉ đo một ô.',
        'Thép phương ngắn hay phương dài nằm ngoài theo bản vẽ thiết kế.'],
    },
    4: {
      svg: svg(`<path d="M20 70 L200 70 L200 100 L380 100 L380 150 L230 150 L230 120 L20 120 Z" class="gd-con"/>` +
        line(25, 80, 185, 80, 'gd-bar') + line(185, 80, 215, 110, 'gd-bar') + line(215, 110, 375, 110, 'gd-bar') +
        line(25, 110, 245, 110, 'gd-bar2') + line(215, 140, 375, 140, 'gd-bar2') +
        dimV(390, 70, 100, '板差', 'left') +
        t(110, 50, '一般樓板', 'gd-s') + t(300, 85, '降板（浴廁、陽台）', 'gd-s') +
        t(200, 190, '鋼筋依設計圖彎折或分開錨定', 'gd-r') + t(200, 215, '降板位置與高差依圖確認', 'gd-s')),
      zh: ['浴廁、陽台等降板處，依設計圖確認位置與高差。',
        '高低板交接處的鋼筋依圖彎折或分開錨定，不可直接切斷。'],
      vi: ['Tại chỗ sàn hạ cốt (nhà vệ sinh, ban công), xác nhận vị trí và độ chênh cao theo bản vẽ.',
        'Thép tại chỗ giao sàn cao thấp phải bẻ hoặc neo riêng theo bản vẽ, không được cắt đứt.'],
    },
    5: {
      svg: svg(rect(20, 30, 170, 150, 'gd-paper') +
        [50, 105, 160].map(x => [60, 115, 170].map(y => rect(x - 6, y - 6, 12, 12, 'gd-spacer')).join('')).join('') +
        dimH(50, 105, 45, '@60cm') + t(105, 205, '平面：墊塊排列', 'gd-s') +
        line(215, 150, 385, 150, 'gd-floor') +
        rect(240, 136, 12, 14, 'gd-spacer') + rect(340, 136, 12, 14, 'gd-spacer') + line(220, 132, 380, 132, 'gd-bar') +
        `<path d="M270 132 L280 80 L330 80 L340 132" class="gd-chair"/>` + line(220, 76, 380, 76, 'gd-bar') +
        t(300, 60, '上層筋：鐵馬（馬椅）', 'gd-r') + t(300, 175, '下層筋：墊塊', 'gd-r') + t(300, 205, '斷面', 'gd-s')),
      zh: ['下層筋用墊塊墊高，上層筋用鐵馬（馬椅）撐住，上、下層間距都不超過規定（例如 @60cm）。',
        '人踩過後墊塊容易移位或壓壞，澆置前要再巡一次。'],
      vi: ['Thép lớp dưới kê bằng con kê, thép lớp trên đỡ bằng chân ngựa; khoảng cách lớp trên, lớp dưới đều không vượt quy định (ví dụ @60cm).',
        'Sau khi người đi lại con kê dễ xê dịch hoặc vỡ, trước khi đổ bê tông phải kiểm tra lại.'],
    },
    6: {
      svg: svg(rect(75, 50, 110, 100, 'gd-con') + line(80, 70, 180, 70, 'gd-bar') + line(80, 130, 180, 130, 'gd-bar') +
        dimV(65, 50, 70, '保護層', 'left') + dimV(65, 130, 150, '保護層', 'left') +
        t(130, 40, '一般樓板', 'gd-b') + t(130, 172, '上、下都要量', 'gd-s') +
        rect(270, 50, 115, 100, 'gd-con') + `<rect x="265" y="150" width="125" height="30" class="gd-soil"/>` +
        line(275, 70, 380, 70, 'gd-bar') + line(275, 110, 380, 110, 'gd-bar') + dimV(260, 110, 150, '7.5cm', 'left') +
        t(327, 40, '與土壤、水接觸', 'gd-b') + t(327, 170, '土壤', 'gd-s') +
        t(200, 220, '保護層＝鋼筋外緣到混凝土表面的距離', 'gd-r')),
      zh: ['保護層是鋼筋「外緣」到混凝土表面的距離，不是到鋼筋中心。',
        '一般樓板依規定（例如 2cm）；直接和土壤、水接觸的部位要加厚（例如 7.5cm）。'],
      vi: ['Lớp bảo vệ là khoảng cách từ "mép ngoài" thanh thép đến mặt bê tông, không phải đến tâm thanh thép.',
        'Sàn thông thường theo quy định (ví dụ 2cm); bộ phận tiếp xúc trực tiếp với đất, nước phải dày hơn (ví dụ 7,5cm).'],
    },
    7: {
      svg: svg(rect(20, 20, 360, 200, 'gd-paper') +
        [70, 110, 290, 330].map(x => line(x, 25, x, 215, 'gd-bar-thin')).join('') +
        [160, 200, 240].map(x => line(x, 25, x, 80, 'gd-bar-thin') + line(x, 160, x, 215, 'gd-bar-thin')).join('') +
        rect(150, 80, 100, 80, 'gd-hole') + t(200, 125, '開口', 'gd-s') +
        line(130, 30, 130, 210, 'gd-bar') + line(270, 30, 270, 210, 'gd-bar') +
        line(60, 65, 340, 65, 'gd-bar') + line(60, 175, 340, 175, 'gd-bar') +
        // 45° 斜筋：橫跨開口四個角（和角的分角線垂直）
        line(120, 98, 168, 50, 'gd-bar') + line(232, 50, 280, 98, 'gd-bar') + line(120, 142, 168, 190, 'gd-bar') + line(232, 190, 280, 142, 'gd-bar') +
        line(250, 160, 250, 240, 'gd-dimx') + line(340, 175, 340, 240, 'gd-dimx') + dimH(250, 340, 240, '伸出開口邊'), 260),
      zh: ['開口切斷了幾支鋼筋，就在開口兩側補幾支同號數的補強筋（圖中紅色粗線），伸出開口邊的長度依規定。',
        '開口較大（例如 30～80cm）時，四個角再加 45° 斜向補強筋。',
        '更大的開口依結構圖另行設計。'],
      vi: ['Lỗ mở cắt mất bao nhiêu thanh thì bổ sung bấy nhiêu thanh cùng số hiệu ở hai bên lỗ mở (đường đỏ đậm trên hình), chiều dài nhô ra khỏi mép lỗ theo quy định.',
        'Lỗ mở lớn hơn (ví dụ 30–80cm) thì thêm thép gia cường chéo 45° ở bốn góc.',
        'Lỗ mở lớn hơn nữa thì theo thiết kế riêng trên bản vẽ kết cấu.'],
    },
    8: {
      svg: svg(rect(30, 30, 340, 190, 'gd-paper') + line(30, 30, 370, 30, 'gd-floor') + line(30, 30, 30, 220, 'gd-floor') +
        t(200, 22, '外側梁', 'gd-s') +
        [60, 120, 180, 240, 300, 360].map(x => line(x, 35, x, 215, 'gd-bar-thin')).join('') +
        [90, 105].map(x => line(x, 35, x, 98, 'gd-bar')).join('') + [45, 75].map(x => line(x, 35, x, 98, 'gd-bar')).join('') +
        [45, 60, 75, 90].map(y => line(35, y, 110, y, 'gd-bar')).join('') +
        rect(32, 32, 80, 68, 'gd-zone') +
        dimH(30, 112, 118, 'L/5', 14) + dimV(125, 30, 100, 'L/5') +
        t(240, 140, 'L＝板短向跨度', 'gd-s') + t(240, 165, '角隅範圍內加筋，', 'gd-r') + t(240, 188, '間距為原本的一半', 'gd-r')),
      zh: ['樓板外角（兩邊都沒有連續樓板的角落）容易產生斜向裂縫，要加角隅補強筋。',
        '補強範圍與長度約為跨度的 1/5（L/5），間距為原本的一半；上層、下層依設計圖說。'],
      vi: ['Góc ngoài của sàn (góc mà hai cạnh không có sàn liên tục) dễ nứt chéo, phải thêm thép gia cường góc.',
        'Phạm vi và chiều dài gia cường khoảng 1/5 nhịp (L/5), khoảng cách bằng một nửa ban đầu; lớp trên, lớp dưới theo bản vẽ thiết kế.'],
    },
  };

  /* ---------- 14 施工架 ---------- */
  const ng = (x, y, s) => t(x, y, '✘ ' + s, 'gd-ngt', 'start');
  // 框式施工架立面：n 跨 × m 層，左下角 (x0, y0)，每跨 w、每層 h
  const frames = (x0, y0, n, m, w, h, cross = true) => {
    let s = '';
    for (let i = 0; i <= n; i++) s += line(x0 + i * w, y0, x0 + i * w, y0 - m * h, 'gd-pipe');
    for (let j = 0; j <= m; j++) s += line(x0, y0 - j * h, x0 + n * w, y0 - j * h, 'gd-pipe');
    if (cross) for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      s += line(x0 + i * w, y0 - j * h, x0 + (i + 1) * w, y0 - (j + 1) * h, 'gd-brace') +
        line(x0 + (i + 1) * w, y0 - j * h, x0 + i * w, y0 - (j + 1) * h, 'gd-brace');
    }
    return s;
  };
  const G14 = {
    0: {
      svg: svg(frames(60, 200, 3, 2, 90, 75) +
        line(60, 162, 330, 162, 'gd-red') + line(60, 87, 330, 87, 'gd-red') +
        t(345, 166, '下拉桿', 'gd-r', 'start') + t(200, 30, '交叉拉桿（X）＋ 下拉桿', 'gd-b') +
        line(30, 214, 370, 214, 'gd-floor') + t(345, 140, '交叉拉桿', 'gd-s', 'start')),
      zh: ['施工架內、外兩側每一層都要裝交叉拉桿（X 型）。',
        '交叉拉桿下方空隙大，人容易從下面掉出去，所以要再加下拉桿（橫桿）擋住。',
        '拆掉交叉拉桿施工後要馬上裝回去。'],
      vi: ['Mặt trong và mặt ngoài giàn giáo, tầng nào cũng phải lắp thanh giằng chéo (hình X).',
        'Phía dưới thanh giằng chéo có khe hở lớn, người dễ rơi ra, nên phải lắp thêm thanh giằng dưới (thanh ngang) để chắn.',
        'Tháo thanh giằng chéo để thi công xong phải lắp lại ngay.'],
    },
    1: {
      svg: svg(t(105, 30, '✔ 鋪滿、密接', 'gd-ok') +
        [0, 1, 2, 3].map(i => rect(30 + i * 38, 60, 34, 120, 'gd-plank')).join('') + dimH(30, 182, 200, '寬度 ≧ 40cm', 16) +
        t(300, 30, '✘ 有空隙、單片', 'gd-ngt') +
        [0, 2].map(i => rect(225 + i * 45, 60, 34, 120, 'gd-plank')).join('') +
        line(262, 65, 262, 175, 'gd-red') + t(300, 200, '縫隙不可大於 3cm', 'gd-r')),
      zh: ['工作台要鋪滿板料，板與板之間要密接，縫隙不可大於 3cm。',
        '工作台寬度要 40cm 以上，不可只放一片板子。'],
      vi: ['Sàn thao tác phải lát kín bằng ván, các tấm ván liền khít nhau, khe hở không lớn hơn 3cm.',
        'Bề rộng sàn thao tác từ 40cm trở lên, không được chỉ đặt một tấm ván.'],
    },
    2: {
      svg: svg(rect(30, 30, 60, 190, 'gd-con') + t(60, 125, '構造物', 'gd-s') +
        line(170, 30, 170, 220, 'gd-pipe') + line(260, 30, 260, 220, 'gd-pipe') +
        rect(170, 95, 90, 8, 'gd-plank') + rect(90, 95, 80, 8, 'gd-plank2') +
        dimH(90, 170, 85, '開口 > 20cm') + t(130, 125, '補助板料', 'gd-g') +
        `<path d="M92 160 Q130 185 168 160" class="gd-net"/>` + t(130, 205, '或安全網', 'gd-g') +
        t(320, 99, '施工架', 'gd-s')),
      zh: ['施工架和建築物之間的空隙超過 20cm，要加補助板料把空隙蓋起來，或在下方張安全網。',
        '轉角、凸出物附近最容易留空隙，要特別注意。'],
      vi: ['Khe hở giữa giàn giáo và công trình vượt quá 20cm phải lát thêm ván phụ che kín, hoặc căng lưới an toàn phía dưới.',
        'Gần góc và chỗ nhô ra dễ để hở nhất, cần đặc biệt chú ý.'],
    },
    3: {
      svg: svg(frames(20, 200, 6, 2, 60, 75, false) +
        [0, 1].map(j => line(140, 200 - j * 75, 200, 200 - (j + 1) * 75, 'gd-stair')).join('') +
        t(170, 40, '上下設備（樓梯）', 'gd-r') + dimH(20, 380, 225, '每 30m 內至少 1 處', -6)),
      zh: ['施工架每 30m 範圍內至少要有 1 處安全上下設備（施工架專用樓梯）。',
        '不可以爬施工架的框架或交叉拉桿上下。'],
      vi: ['Trong phạm vi 30m giàn giáo phải có ít nhất 1 lối lên xuống an toàn (cầu thang giàn giáo).',
        'Không được leo lên xuống bằng khung giàn hoặc thanh giằng chéo.'],
    },
    4: {
      svg: svg(line(40, 120, 360, 120, 'gd-pipe') + rect(60, 100, 280, 14, 'gd-plank') +
        `<path d="M70 114 L70 128 Q70 134 76 134 L84 134" class="gd-hook"/>` + `<path d="M330 114 L330 128 Q330 134 324 134 L316 134" class="gd-hook"/>` +
        t(75, 160, '金屬扣鎖', 'gd-r') + t(325, 160, '防脫落鉤', 'gd-r') +
        t(200, 60, '踏板兩端都要扣住橫桿', 'gd-b') + t(200, 200, '沒有扣鎖的板料要用鐵絲綁牢', 'gd-s')),
      zh: ['踏板兩端的金屬扣鎖要確實扣在橫桿上，並有防脫落鉤。',
        '沒有扣鎖的板料要用鐵絲綁牢，避免被風吹動或踩翻。'],
      vi: ['Khóa kim loại ở hai đầu ván phải móc chắc vào thanh ngang và có móc chống tuột.',
        'Ván không có khóa phải buộc chặt bằng dây thép, tránh bị gió thổi hoặc giẫm lật.'],
    },
    5: {
      svg: svg(frames(40, 210, 2, 2, 90, 80, false) + line(220, 50, 220, 210, 'gd-pipe') +
        line(220, 60, 300, 60, 'gd-red') + line(220, 95, 300, 95, 'gd-red') + rect(220, 120, 80, 10, 'gd-plank') +
        line(300, 50, 300, 130, 'gd-red') +
        dimV(320, 60, 130, '≧ 90cm') + t(250, 40, '端部護欄', 'gd-r') +
        t(265, 155, '上欄杆＋中欄杆＋腳趾板', 'gd-s')),
      zh: ['施工架兩端的立架和轉角處，要設護欄防止人從側面掉下去。',
        '護欄包含上欄杆（高度 90cm 以上）、中欄杆和腳趾板。'],
      vi: ['Khung đứng ở hai đầu và các góc giàn giáo phải lắp lan can để người không rơi ra từ bên hông.',
        'Lan can gồm thanh trên (cao từ 90cm trở lên), thanh giữa và tấm chắn chân.'],
    },
    6: {
      svg: svg(line(40, 50, 360, 50, 'gd-rope') + rect(30, 40, 12, 20, 'gd-col') + rect(358, 40, 12, 20, 'gd-col') +
        t(200, 38, '安全母索（固定在牢固的錨點）', 'gd-r') +
        `<circle cx="200" cy="120" r="14" class="gd-person"/>` + line(200, 134, 200, 190, 'gd-person-l') +
        line(200, 150, 200, 50, 'gd-lanyard') + t(212, 100, '安全帶掛在母索上', 'gd-s', 'start') +
        line(30, 200, 370, 200, 'gd-floor')),
      zh: ['高處作業的地方要拉設安全母索，兩端固定在牢固的錨點。',
        '作業人員的安全帶要掛在母索上，移動時也不可解開。'],
      vi: ['Nơi làm việc trên cao phải căng dây cứu sinh chính, hai đầu cố định vào điểm neo chắc chắn.',
        'Dây an toàn của công nhân phải móc vào dây cứu sinh, khi di chuyển cũng không được tháo ra.'],
    },
    7: {
      svg: svg(rect(30, 20, 340, 200, 'gd-wall') + t(200, 14, '牆（建築物）立面', 'gd-s') +
        [[80, 60], [230, 60], [80, 170], [230, 170]].map(([x, y]) => dot(x, y, 6, 'gd-tie')).join('') +
        dimH(80, 230, 40, '水平 ≦ 7.5m') + dimV(255, 60, 170, '垂直 ≦ 5.5m') +
        t(200, 205, '● 壁拉桿（連接施工架與牆）', 'gd-r')),
      zh: ['壁拉桿把施工架和建築物拉在一起，防止施工架倒塌。',
        '間距：垂直方向 5.5m 以內、水平方向 7.5m 以內各設一處。',
        '施工中不可任意拆掉；一定要拆時先在旁邊補設。'],
      vi: ['Thanh neo tường liên kết giàn giáo với công trình, chống đổ giàn giáo.',
        'Khoảng cách: theo phương đứng trong 5,5m, phương ngang trong 7,5m bố trí một điểm.',
        'Trong khi thi công không được tự ý tháo; nếu bắt buộc tháo phải bổ sung bên cạnh trước.'],
    },
    8: {
      svg: svg(line(60, 40, 60, 200, 'gd-pipe-b') + ok(30, 225, '筆直、無鏽蝕') +
        `<path d="M200 40 Q215 120 200 200" class="gd-pipe-bad"/>` + ng(160, 225, '彎曲變形') +
        line(330, 40, 330, 200, 'gd-pipe-b') + [70, 100, 150].map(y => dot(330, y, 5, 'gd-rust')).join('') + ng(290, 225, '嚴重鏽蝕')),
      zh: ['施工架的立架、拉桿、踏板，有明顯彎曲、變形、裂縫或嚴重鏽蝕的不可使用。',
        '進場時先檢查，不合格的挑出來另外堆放並標示，避免又被拿去用。'],
      vi: ['Khung đứng, thanh giằng, ván sàn giàn giáo bị cong, biến dạng, nứt hoặc gỉ sét nặng rõ rệt thì không được sử dụng.',
        'Kiểm tra khi nhập vào công trường, loại ra để riêng và đánh dấu, tránh bị lấy dùng lại.'],
    },
    9: {
      svg: svg(frames(40, 210, 3, 2, 80, 80, false) + rect(270, 60, 110, 70, 'gd-sign') +
        t(325, 85, '載重限制', 'gd-b') + t(325, 108, '每層 ○○ kg', 'gd-r') + line(270, 95, 240, 95, 'gd-pipe') +
        t(140, 40, '掛在上下樓梯口等明顯處', 'gd-s')),
      zh: ['施工架的載重限制要做成告示牌，掛在上下樓梯口等明顯、容易看到的地方。',
        '材料不可集中堆放在施工架上，超過限制容易倒塌。'],
      vi: ['Giới hạn tải trọng của giàn giáo phải làm bảng thông báo, treo ở nơi dễ thấy như lối lên xuống cầu thang.',
        'Không được chất vật liệu tập trung trên giàn giáo, vượt giới hạn dễ gây đổ sập.'],
    },
    10: {
      svg: svg(`<rect x="20" y="190" width="360" height="30" class="gd-soil"/>` + t(200, 236, '整平、夯實', 'gd-s') +
        rect(80, 178, 70, 12, 'gd-plank') + rect(250, 178, 70, 12, 'gd-plank') +
        rect(103, 165, 24, 13, 'gd-steel') + rect(273, 165, 24, 13, 'gd-steel') +
        line(115, 165, 115, 120, 'gd-thread') + line(285, 165, 285, 120, 'gd-thread') +
        line(115, 120, 115, 40, 'gd-pipe') + line(285, 120, 285, 40, 'gd-pipe') + line(115, 70, 285, 70, 'gd-pipe') +
        t(160, 150, '可調型基腳座鈑', 'gd-r', 'start') + t(160, 196, '墊木', 'gd-s', 'start')),
      zh: ['施工架底下的地面要先整平、夯實，避免下陷造成施工架歪斜。',
        '每支立柱下方要有可調型基腳座鈑（可以調整高低），軟弱地面再加墊木分散重量。'],
      vi: ['Mặt đất dưới giàn giáo phải san phẳng, đầm chặt trước, tránh lún làm giàn giáo nghiêng.',
        'Dưới mỗi chân đứng phải có đế chân điều chỉnh (chỉnh được cao thấp); nền yếu thì kê thêm ván gỗ để phân tán tải.'],
    },
    11: {
      svg: svg(line(150, 30, 150, 110, 'gd-pipe-b') + line(150, 120, 150, 210, 'gd-pipe-b') +
        rect(144, 95, 12, 40, 'gd-steel') + line(130, 118, 170, 118, 'gd-pin') +
        t(185, 122, '插銷（腳柱接頭）', 'gd-r', 'start') + t(185, 145, '上下架要插到底並鎖住', 'gd-s', 'start') +
        t(150, 230, '立架接頭', 'gd-s')),
      zh: ['上下兩層立架接頭要用腳柱接頭和插銷確實連接，不可只是疊放。',
        '交叉拉桿兩端的鎖扣也要確實扣上。'],
      vi: ['Mối nối khung đứng tầng trên và tầng dưới phải liên kết chắc chắn bằng khớp nối chân và chốt, không được chỉ đặt chồng lên.',
        'Khóa ở hai đầu thanh giằng chéo cũng phải cài chắc chắn.'],
    },
  };

  /* ---------- 38 土方開挖 ---------- */
  const pit = (gl = 60, bot = 180) =>
    `<path d="M20 ${gl} L100 ${gl} L100 ${bot} L300 ${bot} L300 ${gl} L380 ${gl} L380 230 L20 230 Z" class="gd-soil"/>` +
    t(40, gl - 6, 'GL', 'gd-s');
  const G38 = {
    0: {
      svg: svg(`<rect x="20" y="70" width="360" height="160" class="gd-soil"/>` + line(20, 70, 380, 70, 'gd-floor') +
        dot(90, 120, 12, 'gd-pipe-w') + dot(200, 140, 10, 'gd-pipe-g') + rect(280, 110, 60, 22, 'gd-cable') +
        t(90, 160, '自來水', 'gd-s') + t(200, 175, '瓦斯', 'gd-s') + t(310, 150, '電力／電信', 'gd-s') +
        t(200, 30, '開挖前：查管線圖、試挖確認，', 'gd-r') + t(200, 52, '通知管線單位遷移或保護', 'gd-r')),
      zh: ['開挖前先調閱地下管線資料（自來水、瓦斯、電力、電信、下水道），必要時先人工試挖確認位置。',
        '需要遷移的埋設物，通知主管機關或管線單位處理，完成後才可以機械開挖。'],
      vi: ['Trước khi đào phải tra cứu tài liệu đường ống ngầm (nước, gas, điện, viễn thông, cống), khi cần thì đào thử bằng tay để xác định vị trí.',
        'Công trình ngầm cần di dời phải thông báo cơ quan quản lý hoặc đơn vị đường ống xử lý, xong mới được đào bằng máy.'],
    },
    1: {
      svg: svg(pit() + line(70, 60, 70, 20, 'gd-red') + line(330, 60, 330, 20, 'gd-red') +
        line(40, 25, 100, 25, 'gd-red') + line(300, 25, 360, 25, 'gd-red') + line(40, 42, 100, 42, 'gd-red') + line(300, 42, 360, 42, 'gd-red') +
        `<circle cx="200" cy="30" r="9" class="gd-lamp"/>` + t(200, 55, '夜間照明', 'gd-s') +
        t(70, 14, '安全欄杆', 'gd-r') + t(330, 14, '安全欄杆', 'gd-r')),
      zh: ['開挖周邊要設安全欄杆，防止人員、車輛掉進開挖區。',
        '夜間或光線不足時要有照明，出入口另設警示。'],
      vi: ['Xung quanh hố đào phải lắp lan can an toàn, ngăn người và xe rơi xuống.',
        'Ban đêm hoặc thiếu sáng phải có chiếu sáng, lối ra vào có biển cảnh báo.'],
    },
    2: {
      svg: svg(pit(60, 140) + line(20, 205, 380, 205, 'gd-water') + t(110, 222, '地下水位', 'gd-w', 'start') +
        dimV(320, 140, 205, '≧ 100cm') + t(200, 132, '開挖完成面', 'gd-s') +
        rect(65, 60, 10, 170, 'gd-well') + t(110, 100, '← 降水井', 'gd-s', 'start')),
      zh: ['用降水井或抽水，把地下水位維持在開挖完成面以下至少 100cm。',
        '每天記錄水位觀測井的讀數，水位上升要立即加強抽水。'],
      vi: ['Dùng giếng hạ mực nước hoặc bơm, giữ mực nước ngầm thấp hơn mặt đáy hố đào ít nhất 100cm.',
        'Mỗi ngày ghi số đọc giếng quan trắc mực nước, nước dâng phải tăng cường bơm ngay.'],
    },
    3: {
      svg: svg(rect(60, 80, 180, 70, 'gd-truck') + rect(240, 100, 70, 50, 'gd-truck') +
        `<path d="M55 78 Q150 60 245 78" class="gd-net"/>` + t(150, 60, '覆蓋防塵網', 'gd-r') +
        dot(100, 160, 16, 'gd-wheel') + dot(270, 160, 16, 'gd-wheel') +
        `<path d="M250 200 l10 -12 l10 12 M280 200 l10 -12 l10 12" class="gd-hook"/>` + t(275, 220, '洗車台清洗輪胎', 'gd-r')),
      zh: ['運土卡車離開工地前，車斗要覆蓋防塵網，避免沿路掉落土石、揚塵。',
        '經過洗車台把輪胎、車身的泥土沖乾淨，才可以上路。'],
      vi: ['Trước khi rời công trường, thùng xe tải chở đất phải phủ lưới chống bụi, tránh rơi đất đá, bụi dọc đường.',
        'Qua bãi rửa xe rửa sạch bùn đất ở bánh xe và thân xe mới được ra đường.'],
    },
    4: {
      svg: svg(pit() + dimV(200, 60, 180, '開挖深度 GL−○m') + `<path d="M310 25 L330 25 L320 40 Z" class="gd-tri"/>` +
        line(320, 40, 320, 175, 'gd-laser') + t(338, 30, '水準儀', 'gd-s', 'start') +
        t(200, 205, '分區量測，誤差 ±5cm', 'gd-r')),
      zh: ['以 GL（設計地面基準）往下量開挖深度，用水準儀分區量測。',
        '深度誤差在規定標準內；接近完成面時要多量幾點。'],
      vi: ['Đo độ sâu đào từ GL (mốc mặt đất thiết kế) xuống, dùng máy thủy bình đo từng khu.',
        'Sai số độ sâu trong tiêu chuẩn; gần đến mặt đáy phải đo thêm nhiều điểm.'],
    },
    5: {
      svg: svg(pit() + `<path d="M180 180 Q200 160 220 180" class="gd-heave"/>` + t(200, 158, '隆起', 'gd-r') +
        `<path d="M260 180 l0 -10 M268 180 l0 -14 M276 180 l0 -10" class="gd-water-l"/>` + t(270, 160, '湧水', 'gd-w') +
        `<path d="M310 60 Q340 72 370 60" class="gd-heave"/>` + t(340, 52, '沉陷', 'gd-r') +
        line(100, 100, 120, 130, 'gd-red') + t(130, 115, '滑動、崩落', 'gd-r', 'start') +
        t(200, 30, '每天巡查，發現異常立即停工', 'gd-b')),
      zh: ['每天巡查開挖面和周邊：有沒有湧水、底部隆起、周邊地面沉陷或裂縫、側壁滑動崩落。',
        '發現任何一種情形要立即停工、人員撤離，並通知工地主任處理。'],
      vi: ['Mỗi ngày kiểm tra mặt hố đào và xung quanh: có nước phun trào, đáy đẩy trồi, mặt đất xung quanh lún hoặc nứt, thành hố trượt sụt không.',
        'Phát hiện bất kỳ hiện tượng nào phải dừng thi công ngay, sơ tán người và báo chỉ huy trưởng xử lý.'],
    },
    6: {
      svg: svg(pit(60, 160) + line(100, 160, 300, 160, 'gd-mark') + t(200, 152, '設計完成面', 'gd-r') +
        `<path d="M140 160 L150 172 L170 172 L180 160" class="gd-over"/>` + dimV(190, 160, 172, '超挖 < 5cm') +
        t(200, 210, '最後一層可留 20～30cm 用平口挖斗或人工修整', 'gd-s')),
      zh: ['開挖底面要平整，超挖不可超過規定（例如 5cm）。',
        '接近完成面時改用平口挖斗或人工修整，避免挖太深擾動底下的土。',
        '超挖的部分依設計要求回填，不可用鬆土隨便填平。'],
      vi: ['Mặt đáy hố đào phải phẳng, đào quá không được vượt quy định (ví dụ 5cm).',
        'Gần đến mặt đáy đổi sang gầu miệng phẳng hoặc sửa bằng tay, tránh đào sâu làm xáo trộn đất bên dưới.',
        'Phần đào quá phải lấp theo yêu cầu thiết kế, không được dùng đất tơi lấp đại.'],
    },
    7: {
      svg: svg(rect(30, 30, 340, 190, 'gd-soil-l') + rect(45, 45, 310, 160, 'gd-paper') +
        rect(45, 45, 310, 12, 'gd-ditch') + rect(45, 193, 310, 12, 'gd-ditch') + rect(45, 45, 12, 160, 'gd-ditch') + rect(343, 45, 12, 160, 'gd-ditch') +
        rect(325, 175, 30, 30, 'gd-sump') + t(200, 125, '開挖面（平面）', 'gd-s') +
        t(200, 75, '四周導溝', 'gd-w') + t(300, 170, '集水坑＋抽水機', 'gd-w', 'end')),
      zh: ['開挖面四周要做導溝，把水引到集水坑，再用抽水機抽出去。',
        '開挖面不可積水，雨後要先抽乾才能繼續施工。'],
      vi: ['Xung quanh mặt hố đào phải làm rãnh dẫn nước về hố thu, rồi dùng máy bơm hút ra ngoài.',
        'Mặt hố đào không được đọng nước, sau mưa phải bơm khô mới tiếp tục thi công.'],
    },
  };

  /* ---------- 48 水平支撐 ---------- */
  // H 型鋼斷面
  const hbeam = (x, y, w, h, tf, tw, cls = 'gd-steel') =>
    `<path d="M${x} ${y} h${w} v${tf} h${-(w - tw) / 2} v${h - 2 * tf} h${(w - tw) / 2} v${tf} h${-w} v${-tf} h${(w - tw) / 2} v${-(h - 2 * tf)} h${-(w - tw) / 2} Z" class="${cls}"/>`;
  const wallPlan = () => rect(20, 30, 20, 190, 'gd-sheet') + rect(40, 30, 26, 190, 'gd-wale') + t(30, 236, '擋土壁', 'gd-s') + t(53, 22, '圍令', 'gd-s');
  const G48 = {
    0: {
      svg: svg(hbeam(130, 40, 140, 140, 16, 10) +
        dimH(130, 270, 30, 'B = 350') + dimV(285, 40, 180, 'H = 350') +
        t(210, 115, '← 腹板 tw = 12', 'gd-dimt', 'start') + t(200, 205, '翼板 tf = 19', 'gd-dimt') +
        t(200, 232, '單位 mm；用卡尺量，與送審資料核對', 'gd-s')),
      zh: ['水平支撐用 H 型鋼，規格依圖（例如 H350×350×12×19：高×寬×腹板厚×翼板厚，單位 mm）。',
        '進場時用卡尺抽量，並和送審的材料證明核對；彎曲、變形的不可使用。'],
      vi: ['Thanh chống ngang dùng thép hình H, quy cách theo bản vẽ (ví dụ H350×350×12×19: cao × rộng × dày bụng × dày cánh, đơn vị mm).',
        'Khi nhập về dùng thước kẹp đo kiểm, đối chiếu với chứng chỉ vật liệu đã duyệt; thanh cong, biến dạng không được sử dụng.'],
    },
    1: {
      svg: svg(rect(20, 20, 30, 210, 'gd-sheet') + `<path d="M50 130 L110 130 L50 190 Z" class="gd-steel"/>` +
        rect(50, 100, 150, 30, 'gd-wale') + t(130, 95, '圍令', 'gd-s') + t(75, 210, '三角托架', 'gd-r', 'start') +
        line(250, 130, 380, 130, 'gd-mark') + t(315, 122, '設計高程', 'gd-r') + dimV(260, 130, 145, '≦ 5cm') +
        t(35, 14, '擋土壁', 'gd-s')),
      zh: ['三角托架是放圍令的架子，先依設計高程放樣，再焊接或鎖在擋土壁上。',
        '托架高程誤差在 5cm 以內，否則圍令和支撐會歪斜。'],
      vi: ['Giá đỡ tam giác là giá để đặt dầm vành, định vị theo cao độ thiết kế trước rồi hàn hoặc bắt bu lông vào tường chắn.',
        'Sai số cao độ giá đỡ trong 5cm, nếu không dầm vành và thanh chống sẽ bị lệch.'],
    },
    2: {
      svg: svg(rect(20, 20, 30, 210, 'gd-sheet') + `<path d="M50 80 L160 80 L50 190 Z" class="gd-steel"/>` +
        [[65, 95], [65, 130], [65, 165]].map(([x, y]) => dot(x, y, 5, 'gd-bolt')).join('') +
        line(50, 80, 50, 190, 'gd-weld') + t(200, 110, '● 螺栓鎖緊', 'gd-r', 'start') + t(200, 140, '｜ 焊道連續、飽滿', 'gd-r', 'start') +
        t(200, 190, '不可只點焊幾點', 'gd-s', 'start')),
      zh: ['三角托架要確實固定在擋土壁（或中間樁）上：螺栓全部鎖緊，焊接的焊道要連續、飽滿。',
        '不可只點焊幾點，圍令和支撐的重量都靠托架撐住。'],
      vi: ['Giá đỡ tam giác phải cố định chắc vào tường chắn (hoặc cọc trung gian): siết chặt tất cả bu lông, đường hàn phải liên tục, đầy đặn.',
        'Không được chỉ hàn đính vài điểm, toàn bộ trọng lượng dầm vành và thanh chống dựa vào giá đỡ.'],
    },
    3: {
      svg: svg(wallPlan() + rect(334, 30, 26, 190, 'gd-wale') + rect(360, 30, 20, 190, 'gd-sheet') +
        rect(66, 115, 268, 20, 'gd-steel') + line(66, 125, 334, 125, 'gd-axis') +
        `<path d="M66 175 L334 160" class="gd-strut-bad"/>` + ok(150, 105, '支撐軸線筆直') + ng(150, 195, '歪斜')),
      zh: ['支撐要對準設計軸線安裝，從頭到尾成一直線，兩端垂直頂住圍令。',
        '支撐歪斜會讓力量偏心，容易挫屈（彎掉）。'],
      vi: ['Thanh chống phải lắp đúng trục thiết kế, từ đầu đến cuối thẳng hàng, hai đầu vuông góc tì vào dầm vành.',
        'Thanh chống lệch làm lực lệch tâm, dễ bị mất ổn định (cong oằn).'],
    },
    4: {
      svg: svg(rect(30, 100, 160, 40, 'gd-steel') + rect(210, 100, 160, 40, 'gd-steel') + line(200, 90, 200, 150, 'gd-axis') +
        rect(150, 92, 100, 56, 'gd-plate') +
        [165, 185, 215, 235].map(x => dot(x, 108, 4, 'gd-bolt') + dot(x, 132, 4, 'gd-bolt')).join('') +
        t(200, 80, '連接鈑＋螺栓', 'gd-r') + t(200, 180, '螺栓數量依圖，全部鎖緊', 'gd-s')),
      zh: ['兩支支撐的接頭要用連接鈑（翼板、腹板都要）和螺栓接合。',
        '螺栓數量、大小依設計圖，全部鎖緊，不可少裝。'],
      vi: ['Mối nối giữa hai thanh chống phải dùng bản mã (cả cánh và bụng) và bu lông.',
        'Số lượng, kích cỡ bu lông theo bản vẽ, siết chặt tất cả, không được lắp thiếu.'],
    },
    5: {
      svg: svg(rect(20, 60, 360, 30, 'gd-wale') + line(20, 75, 380, 75, 'gd-axis') + t(200, 50, '圍令（立面）', 'gd-s') +
        line(20, 140, 380, 140, 'gd-mark') + line(20, 140, 380, 155, 'gd-red') + dimV(385, 140, 155, '≦5cm', 'left') +
        t(200, 180, '兩端高差 ≦ 5cm', 'gd-r')),
      zh: ['圍令吊放到三角托架上時要保持水平，兩端高低差在 5cm 以內。',
        '用水準儀或水平管確認，不平的要調整托架或加墊鈑。'],
      vi: ['Khi cẩu đặt dầm vành lên giá đỡ tam giác phải giữ ngang bằng, chênh lệch cao độ hai đầu trong 5cm.',
        'Dùng máy thủy bình hoặc ống nước kiểm tra, không bằng thì chỉnh giá đỡ hoặc kê thêm bản thép.'],
    },
    6: {
      svg: svg(wallPlan() + rect(66, 110, 250, 30, 'gd-steel') +
        line(66, 105, 66, 145, 'gd-red') + line(80, 100, 80, 150, 'gd-red') + line(52, 100, 52, 150, 'gd-red') +
        t(110, 90, '加勁板（補強）', 'gd-r', 'start') + t(110, 175, '接觸面密貼、螺栓鎖緊', 'gd-s', 'start')),
      zh: ['支撐頂到圍令的位置，圍令和支撐都要加加勁板補強，避免局部壓壞。',
        '接觸面要密貼，有空隙要用鋼楔或墊鈑塞緊，螺栓鎖緊。'],
      vi: ['Tại vị trí thanh chống tì vào dầm vành, cả dầm vành và thanh chống phải hàn thêm bản gia cường (sườn tăng cứng), tránh bị ép hỏng cục bộ.',
        'Mặt tiếp xúc phải áp sát, có khe hở thì chèn chặt bằng nêm thép hoặc bản kê, siết chặt bu lông.'],
    },
    7: {
      svg: svg(`<path d="M30 20 L60 20 L60 60 L30 60 L30 100 L60 100 L60 140 L30 140 L30 180 L60 180 L60 220 L30 220" class="gd-sheet-l"/>` +
        rect(110, 20, 40, 200, 'gd-wale') +
        `<path d="M60 20 L110 20 L110 220 L60 220 L60 180 L30 180 L30 140 L60 140 L60 100 L30 100 L30 60 L60 60 Z" class="gd-backfill"/>` +
        t(85, 14, '背填混凝土', 'gd-r') + t(130, 236, '圍令', 'gd-s') + t(45, 236, '鋼鈑樁', 'gd-s') +
        t(170, 110, '圍令與鋼鈑樁凹凸之間的空隙，', 'gd-s', 'start') + t(170, 132, '用混凝土填滿（強度依圖）', 'gd-s', 'start')),
      zh: ['鋼鈑樁是凹凸形狀，和圍令之間會有空隙，要用混凝土背填（強度依圖，例如 280kgf/cm²）填滿。',
        '沒填滿時，土壓力只壓在幾個點上，圍令和鋼鈑樁容易變形。'],
      vi: ['Cọc ván thép có dạng lồi lõm, giữa cọc và dầm vành có khe hở, phải chèn đầy bằng bê tông (cường độ theo bản vẽ, ví dụ 280kgf/cm²).',
        'Nếu không chèn đầy, áp lực đất chỉ dồn vào vài điểm, dầm vành và cọc ván thép dễ biến dạng.'],
    },
    8: {
      svg: svg(rect(180, 20, 40, 210, 'gd-steel') + t(200, 14, '中間樁', 'gd-s') +
        `<path d="M220 140 L280 140 L220 190 Z" class="gd-steel"/>` + `<path d="M180 140 L120 140 L180 190 Z" class="gd-steel"/>` +
        rect(60, 110, 280, 30, 'gd-steel-l') + t(90, 104, '支撐', 'gd-s') +
        `<path d="M250 104 L250 150 M270 104 L270 150 M250 104 Q260 94 270 104" class="gd-ubolt"/>` +
        t(300, 100, 'U 型螺栓', 'gd-r', 'start')),
      zh: ['支撐經過中間樁的地方，放在中間樁的三角托架上，再用 U 型螺栓把支撐扣住固定。',
        '目的是防止支撐長度太長而上下、左右挫屈。'],
      vi: ['Chỗ thanh chống đi qua cọc trung gian, đặt lên giá tam giác của cọc rồi dùng bu lông chữ U ôm giữ cố định.',
        'Mục đích là chống thanh chống quá dài bị cong oằn theo phương đứng và ngang.'],
    },
    9: {
      svg: svg(wallPlan() + rect(66, 110, 230, 30, 'gd-steel') + rect(296, 104, 40, 42, 'gd-jack') + rect(336, 110, 44, 30, 'gd-steel') +
        dot(316, 80, 14, 'gd-gauge') + line(316, 94, 316, 104, 'gd-pipe') + t(316, 60, '油壓計（千斤頂）', 'gd-r') +
        rect(150, 106, 30, 8, 'gd-strain') + t(165, 165, '應變計', 'gd-r') + t(30, 120, '▮', 'gd-r', 'start') +
        t(110, 200, '土壓計埋在擋土壁背後（依圖）', 'gd-s', 'start')),
      zh: ['監測儀器（土壓計、油壓計、支撐應變計）的位置依設計圖說安裝，固定牢靠、加保護。',
        '儀器編號要和監測平面圖對得上，避免讀數記錯位置。'],
      vi: ['Thiết bị quan trắc (áp kế đất, áp kế dầu, đồng hồ đo biến dạng thanh chống) lắp đúng vị trí theo bản vẽ thiết kế, cố định chắc chắn và có bảo vệ.',
        'Số hiệu thiết bị phải khớp với mặt bằng quan trắc, tránh ghi nhầm vị trí số đọc.'],
    },
    10: {
      svg: svg(line(50, 200, 370, 200, 'gd-floor') + line(50, 200, 50, 30, 'gd-floor') +
        line(50, 70, 370, 70, 'gd-red') + t(365, 64, '行動值：停工處理', 'gd-r', 'end') +
        line(50, 110, 370, 110, 'gd-alert') + t(365, 104, '警戒值：加強觀測、通報', 'gd-a', 'end') +
        `<path d="M60 180 L120 170 L180 160 L240 140 L300 120 L350 115" class="gd-trend"/>` +
        t(200, 225, '時間（每天記錄）', 'gd-s') + t(40, 120, '讀數', 'gd-s', 'end')),
      zh: ['依監測計畫的頻率讀取土壓計、應變計數值並記錄。',
        '超過警戒值：加密觀測並通報；超過行動值：停止開挖、依應變計畫處理。',
        '讀數突然上升也要提早通報，不要等到超過才處理。'],
      vi: ['Đọc và ghi số liệu áp kế đất, đồng hồ đo biến dạng theo tần suất của kế hoạch quan trắc.',
        'Vượt giá trị cảnh báo: tăng tần suất quan trắc và báo cáo; vượt giá trị hành động: dừng đào, xử lý theo kế hoạch ứng phó.',
        'Số đọc tăng đột ngột cũng phải báo sớm, không đợi vượt mới xử lý.'],
    },
  };

  /* ---------- 07 柱鋼筋 ---------- */
  const colSec = (x, y, s, n = 4) => { // 柱斷面：外框、箍筋、每邊 n 支主筋
    let o = rect(x, y, s, s, 'gd-con') + rect(x + 14, y + 14, s - 28, s - 28, 'gd-hoop');
    const step = (s - 40) / (n - 1);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === 0 || j === 0 || i === n - 1 || j === n - 1) o += dot(x + 20 + i * step, y + 20 + j * step, 5);
    }
    return o;
  };
  const G07 = {
    0: {
      svg: svg(colSec(30, 50, 140) + t(100, 40, '斷面：數主筋支數、量號數', 'gd-s') +
        rect(250, 120, 120, 30, 'gd-con') + rect(270, 150, 80, 80, 'gd-con') + t(310, 112, '頂層梁', 'gd-s') +
        line(290, 230, 290, 135, 'gd-bar') + line(290, 135, 330, 135, 'gd-bar') + line(330, 230, 330, 140, 'gd-bar') +
        dimV(255, 135, 230, '錨定長度', 'left') + t(200, 225, '依結構圖彙整的料單', 'gd-r')),
      zh: ['對照料單（由結構圖彙整）點清主筋的號數和支數，每一根柱都要核對。',
        '主筋伸入基礎或頂層梁的錨定長度、彎鉤方向依圖。'],
      vi: ['Đối chiếu bảng thống kê thép (lập từ bản vẽ kết cấu) kiểm tra số hiệu và số thanh thép chủ, cột nào cũng phải kiểm.',
        'Chiều dài neo và hướng móc của thép chủ vào móng hoặc dầm mái theo bản vẽ.'],
    },
    1: {
      svg: svg(rect(150, 20, 100, 210, 'gd-con') + line(165, 20, 165, 230, 'gd-bar') + line(235, 20, 235, 230, 'gd-bar') +
        [30, 42, 54, 66, 78].map(y => line(158, y, 242, y, 'gd-hoop-l')).join('') +
        [110, 135, 160].map(y => line(158, y, 242, y, 'gd-hoop-l')).join('') +
        [190, 202, 214, 226].map(y => line(158, y, 242, y, 'gd-hoop-l')).join('') +
        dimV(260, 20, 85, '圍束區：間距密') + dimV(260, 100, 170, '中段：間距依圖') + dimV(260, 185, 230, '圍束區') +
        t(80, 125, '柱立面', 'gd-s')),
      zh: ['箍筋的號數、形式、間距依料單；柱上下兩端（圍束區）間距較密，中段較疏。',
        '用捲尺連續量幾格，間距要平均，不可只在看得到的地方綁密。'],
      vi: ['Số hiệu, kiểu dáng, khoảng cách đai cột theo bảng thống kê thép; hai đầu cột (vùng bó đai) khoảng cách dày hơn, đoạn giữa thưa hơn.',
        'Dùng thước đo liên tiếp vài khoảng, khoảng cách phải đều, không được chỉ buộc dày ở chỗ dễ thấy.'],
    },
    2: {
      svg: svg([[40, 0], [130, 1], [220, 2], [310, 3]].map(([x, k]) => {
        const c = [[x + 10, 60], [x + 70, 60], [x + 70, 120], [x + 10, 120]][k];
        return rect(x + 10, 60, 60, 60, 'gd-hoop') + `<path d="M${c[0]} ${c[1]} l${k === 0 || k === 3 ? 14 : -14} ${k < 2 ? 14 : -14}" class="gd-hook"/>` +
          dot(c[0], c[1], 5) + t(x + 40, 145, `第 ${k + 1} 支`, 'gd-s');
      }).join('') + t(200, 40, '135° 彎鉤位置依序轉到四個角（不要都在同一角）', 'gd-r') +
        t(200, 190, '每個交叉點用 #22 鐵絲綁紮', 'gd-b')),
      zh: ['相鄰的箍筋，135° 彎鉤位置要輪流放在四個角（四向排紮），不可全部擺在同一個角。',
        '箍筋和主筋每個交叉點都要用 #22 鐵絲綁牢。'],
      vi: ['Các thép đai liền kề, vị trí móc 135° phải luân phiên ở bốn góc (bố trí 4 hướng), không được dồn hết vào cùng một góc.',
        'Mọi điểm giao giữa thép đai và thép chủ đều phải buộc chặt bằng dây thép #22.'],
    },
    3: {
      svg: svg(colSec(40, 40, 150) + line(54, 97, 176, 97, 'gd-bar') +
        `<path d="M60 97 l10 12" class="gd-hook"/>` + `<path d="M170 97 l0 14" class="gd-hook"/>` +
        t(115, 210, '一端 135°、一端 90°', 'gd-r') +
        rect(240, 40, 130, 150, 'gd-paper') + t(305, 60, '上下相鄰兩支', 'gd-s') +
        line(255, 100, 355, 100, 'gd-bar') + t(250, 92, '135°', 'gd-dimt', 'start') + t(360, 92, '90°', 'gd-dimt', 'end') +
        line(255, 150, 355, 150, 'gd-bar') + t(250, 142, '90°', 'gd-dimt', 'start') + t(360, 142, '135°', 'gd-dimt', 'end') +
        t(305, 180, '彎鉤方向交錯', 'gd-r')),
      zh: ['繫筋一端 135° 彎鉤、一端 90° 彎鉤，要鉤住主筋（外側的箍筋）。',
        '上下相鄰的繫筋，135° 和 90° 的位置要左右交錯；每一支都用 #22 鐵絲綁紮。',
        '號數、支數依料單。'],
      vi: ['Thép giằng một đầu móc 135°, một đầu móc 90°, phải móc vào thép chủ (thép đai bên ngoài).',
        'Các thép giằng liền kề trên dưới, vị trí móc 135° và 90° phải so le trái phải; thanh nào cũng buộc bằng dây thép #22.',
        'Số hiệu, số thanh theo bảng thống kê thép.'],
    },
    4: {
      svg: svg(colSec(110, 30, 180, 5) + dimH(130, 175, 230, '@', 0) + dimH(175, 220, 230, '@', 0) + dimH(220, 265, 230, '@', 0) +
        t(200, 20, '主筋間距要平均', 'gd-r')),
      zh: ['同一面的柱主筋間距要平均分配，不可擠在一起或留大空隙。',
        '間距不均會影響混凝土流動，也會讓保護層不一致。'],
      vi: ['Khoảng cách thép chủ cột trên cùng một mặt phải chia đều, không được dồn sát hoặc để khe lớn.',
        'Khoảng cách không đều ảnh hưởng dòng chảy bê tông và làm lớp bảo vệ không đồng đều.'],
    },
    5: {
      svg: svg(colSec(40, 40, 150) + dimH(40, 54, 30, '4cm', -6) +
        rect(105, 190, 20, 12, 'gd-spacer') + rect(28, 105, 12, 20, 'gd-spacer') + rect(190, 105, 12, 20, 'gd-spacer') + rect(105, 28, 20, 12, 'gd-spacer') +
        rect(260, 20, 60, 210, 'gd-con') + [60, 140, 220].map(y => rect(250, y - 8, 10, 16, 'gd-spacer')).join('') +
        dimV(340, 60, 140, '@100cm') + t(290, 14, '立面', 'gd-s') + t(115, 225, '四向都要放墊塊', 'gd-r')),
      zh: ['柱保護層依規定（例如 4cm），與土壤、水接觸的部位要加厚（例如 7.5cm）。',
        '墊塊四個面都要放，垂直間距不超過規定（例如 @100cm）。'],
      vi: ['Lớp bảo vệ cột theo quy định (ví dụ 4cm), bộ phận tiếp xúc với đất, nước phải dày hơn (ví dụ 7,5cm).',
        'Con kê phải đặt ở cả bốn mặt, khoảng cách theo phương đứng không vượt quy định (ví dụ @100cm).'],
    },
    6: {
      svg: svg(rect(140, 20, 120, 210, 'gd-con') + rect(140, 20, 120, 45, 'gd-zone') + rect(140, 185, 120, 45, 'gd-zone') +
        t(200, 46, '圍束區', 'gd-r') + t(200, 212, '圍束區', 'gd-r') +
        [160, 200, 240].map(x => line(x, 20, x, 230, 'gd-bar')).join('') +
        rect(154, 90, 12, 18, 'gd-coupler') + rect(194, 150, 12, 18, 'gd-coupler') + rect(234, 90, 12, 18, 'gd-coupler') +
        dimV(280, 99, 159, '≧ 60cm') + t(100, 130, '續接器', 'gd-s', 'end')),
      zh: ['續接器要放在圍束區（柱上下兩端）以外。',
        '相鄰鋼筋的續接器位置要上下錯開，距離不小於規定（例如 60cm）。'],
      vi: ['Khớp nối ren phải đặt ngoài vùng bó đai (hai đầu trên dưới của cột).',
        'Vị trí khớp nối của các thanh liền kề phải so le trên dưới, khoảng cách không nhỏ hơn quy định (ví dụ 60cm).'],
    },
    7: {
      svg: svg(line(200, 20, 200, 100, 'gd-bar') + line(200, 140, 200, 230, 'gd-bar') + rect(190, 95, 20, 50, 'gd-coupler') +
        rect(210, 112, 140, 16, 'gd-wrench') + t(280, 105, '扭力扳手', 'gd-r') +
        t(280, 160, '設定到規定扭力值', 'gd-s') + t(280, 182, '鎖到「喀」一聲', 'gd-s') +
        t(110, 125, '續接器', 'gd-s')),
      zh: ['續接器鎖好後，用扭力扳手設定到規定扭力值（依號數，例如 #10 = 216N·m）檢查。',
        '檢查過的做記號（例如噴漆），方便抽查。'],
      vi: ['Sau khi vặn khớp nối ren, dùng cờ lê lực đặt đúng lực siết quy định (theo số hiệu, ví dụ #10 = 216N·m) để kiểm tra.',
        'Khớp đã kiểm tra thì đánh dấu (ví dụ phun sơn) để tiện kiểm tra xác suất.'],
    },
    8: {
      svg: svg(line(110, 230, 110, 80, 'gd-bar') + rect(100, 60, 20, 22, 'gd-cap') + t(110, 50, '✔ 有護套', 'gd-ok') +
        line(290, 230, 290, 80, 'gd-bar') + [62, 68, 74, 80].map(y => line(282, y, 298, y - 4, 'gd-rib')).join('') + t(290, 50, '✘ 螺牙外露', 'gd-ngt') +
        t(200, 225, '外露的螺牙碰撞、生鏽就鎖不緊', 'gd-s')),
      zh: ['預留的鋼筋螺牙要套上護套，避免碰撞損壞、沾到混凝土或生鏽。',
        '續接前才拆掉護套，並檢查螺牙乾淨、完整。'],
      vi: ['Ren thép chờ phải chụp nắp bảo vệ, tránh va đập hỏng, dính bê tông hoặc gỉ sét.',
        'Chỉ tháo nắp trước khi nối, đồng thời kiểm tra ren sạch và nguyên vẹn.'],
    },
  };

  /* ---------- 09 梁鋼筋 ---------- */
  const beamElev = () => rect(20, 60, 60, 160, 'gd-con') + rect(320, 60, 60, 160, 'gd-con') + rect(80, 60, 240, 70, 'gd-con') +
    t(50, 236, '柱', 'gd-s') + t(350, 236, '柱', 'gd-s');
  const G09 = {
    0: {
      svg: svg(beamElev() + line(40, 72, 360, 72, 'gd-bar') + line(40, 72, 40, 120, 'gd-bar') + line(360, 72, 360, 120, 'gd-bar') +
        line(45, 118, 355, 118, 'gd-bar') + line(48, 118, 48, 84, 'gd-bar') + line(352, 118, 352, 84, 'gd-bar') +
        dimH(20, 80, 40, '伸入柱內錨定') + t(200, 165, '主筋：上層、下層位置、號數、支數依圖', 'gd-r') +
        t(200, 190, '端部彎鉤在柱內', 'gd-s')),
      zh: ['依圖核對梁主筋的位置（上層、下層、第幾排）、號數、支數。',
        '主筋伸入柱內的錨定長度和 90° 彎鉤依圖：一般上層筋往下彎、下層筋往上彎，彎鉤要在柱的範圍內。'],
      vi: ['Đối chiếu bản vẽ kiểm tra vị trí (lớp trên, lớp dưới, hàng thứ mấy), số hiệu, số thanh thép chủ dầm.',
        'Chiều dài neo vào cột và móc 90° của thép chủ theo bản vẽ: thường thép lớp trên bẻ xuống, lớp dưới bẻ lên, móc phải nằm trong phạm vi cột.'],
    },
    1: {
      svg: svg(beamElev() + line(40, 72, 360, 72, 'gd-bar') + line(45, 118, 355, 118, 'gd-bar') +
        line(50, 80, 140, 80, 'gd-bar2') + line(260, 80, 350, 80, 'gd-bar2') + line(130, 110, 270, 110, 'gd-bar2') +
        t(95, 50, '上層加筋（支承處）', 'gd-r') + t(305, 50, '上層加筋', 'gd-r') + t(200, 150, '下層加筋（跨中）', 'gd-r') +
        t(200, 190, '加筋長度、號數依圖', 'gd-s')),
      zh: ['加筋是補強用的額外鋼筋：上層加筋一般在柱（支承）附近，下層加筋在跨中。',
        '依圖核對加筋的號數、支數、長度與位置，不可漏放或放錯層。'],
      vi: ['Thép tăng cường là thép bổ sung: thép tăng cường lớp trên thường ở gần cột (gối), lớp dưới ở giữa nhịp.',
        'Đối chiếu bản vẽ kiểm tra số hiệu, số thanh, chiều dài và vị trí, không được thiếu hoặc đặt sai lớp.'],
    },
    2: {
      svg: svg(beamElev() + line(40, 72, 230, 72, 'gd-bar') + line(170, 78, 360, 78, 'gd-bar2') +
        line(45, 118, 120, 118, 'gd-bar') + line(90, 112, 355, 112, 'gd-bar2') +
        dimH(170, 230, 45, '上層搭接（跨中）') + dimH(90, 120, 150, '下層搭接（近支承）', 16) +
        t(200, 200, '搭接長度依號數、上下層不同', 'gd-s')),
      zh: ['上層筋在跨中附近搭接，下層筋在支承（柱）附近搭接；實際位置依設計圖。',
        '搭接長度依號數和上、下層不同（見規定標準），量從重疊的起點到終點。'],
      vi: ['Thép lớp trên nối chồng gần giữa nhịp, thép lớp dưới nối chồng gần gối (cột); vị trí thực tế theo bản vẽ thiết kế.',
        'Chiều dài nối chồng khác nhau theo số hiệu và lớp trên, lớp dưới (xem tiêu chuẩn), đo từ điểm bắt đầu đến điểm kết thúc đoạn chồng.'],
    },
    3: {
      svg: svg(beamElev() + [88, 98, 108, 118, 128, 138].map(x => line(x, 66, x, 124, 'gd-hoop-l')).join('') +
        [170, 200, 230].map(x => line(x, 66, x, 124, 'gd-hoop-l')).join('') +
        [262, 272, 282, 292, 302, 312].map(x => line(x, 66, x, 124, 'gd-hoop-l')).join('') +
        dimH(80, 140, 45, '端部：密') + dimH(160, 240, 45, '中段：依圖') + dimH(260, 320, 45, '端部：密') +
        rect(160, 160, 80, 60, 'gd-hoop') + `<path d="M160 160 l14 14 M160 160 l14 -2" class="gd-hook"/>` + t(200, 236, '箍筋 135° 彎鉤', 'gd-s')),
      zh: ['梁箍筋的號數、形式、間距依圖；靠近柱的兩端間距較密，中段較疏。',
        '箍筋要用 135° 彎鉤，第一支箍筋離柱面的距離依圖（一般 5cm 以內）。'],
      vi: ['Số hiệu, kiểu dáng, khoảng cách đai dầm theo bản vẽ; hai đầu gần cột khoảng cách dày hơn, đoạn giữa thưa hơn.',
        'Đai dầm phải móc 135°, khoảng cách đai đầu tiên đến mặt cột theo bản vẽ (thường trong 5cm).'],
    },
    4: {
      svg: svg(rect(130, 30, 140, 190, 'gd-con') + rect(145, 45, 110, 160, 'gd-hoop') +
        [160, 200, 240].map(x => dot(x, 58, 6) + dot(x, 192, 6)).join('') +
        dimV(115, 205, 220, '底 4cm', 'left') + dimH(255, 270, 125, '側 4cm', -8) +
        rect(150, 220, 20, 10, 'gd-spacer') + rect(230, 220, 20, 10, 'gd-spacer') + t(330, 225, '底部墊塊', 'gd-r')),
      zh: ['梁的底面、側面保護層依規定（例如 4cm），與土壤、水接觸的部位要加厚（例如 7.5cm）。',
        '梁底要放墊塊，側面用側墊塊或固定器，避免鋼筋籠貼到模板。'],
      vi: ['Lớp bảo vệ đáy và hai bên dầm theo quy định (ví dụ 4cm), bộ phận tiếp xúc với đất, nước phải dày hơn (ví dụ 7,5cm).',
        'Đáy dầm phải đặt con kê, hai bên dùng con kê bên hoặc kẹp định vị, tránh lồng thép áp sát ván khuôn.'],
    },
  };

  window.SK_GUIDES = { '01': G01, '10': G10, '14': G14, '38': G38, '48': G48, '07': G07, '09': G09 };
})();
