export interface SampleExam {
  id: string;
  title: string;
  description: string;
  latex: string;
}

export const SAMPLE_EXAMS: SampleExam[] = [
  {
    id: 'thpt-chuan-2025',
    title: 'Đề mẫu THPT 2025 (Có Bảng biến thiên tkz-tab & TikZ 3D)',
    description: 'Bao gồm bảng biến thiên tkz-tab, hình chóp 3D, đúng/sai format mới 2025 và câu hỏi trả lời ngắn.',
    latex: `\\begin{ex}%[2D1B1-1]
Cho hàm số $y = f(x)$ liên tục trên $\\mathbb{R}$ và có bảng biến thiên như sau:
\\begin{center}
\\begin{tikzpicture}
\\tkzTabInit[lgt=1.2,espcl=2.5]{$x$/1,$y'$/1,$y$/2}{$-\\infty$,$-1$,$0$,$1$,$+\\infty$}
\\tkzTabLine{,-,0,+,0,-,0,+,}
\\tkzTabVar{+/$+\\infty$,-/$-2$,+/$1$,-/$-2$,+/$+\\infty$}
\\end{tikzpicture}
\\end{center}
Hàm số đã cho đạt cực đại tại điểm nào dưới đây?
\\choice
{\\True $x = 0$}
{$x = -1$}
{$x = 1$}
{$x = -2$}
\\loigiai{
Từ bảng biến thiên, ta thấy đạo hàm $y'$ đổi dấu từ dương sang âm khi đi qua điểm $x = 0$. Do đó, hàm số đạt cực đại tại $x = 0$ và giá trị cực đại là $y_{\\text{CĐ}} = 1$.
}
\\end{ex}

\\begin{ex}%[2D1Y1-1]
Cho hàm số $y = f(x)$ có đồ thị như hình vẽ bên dưới:
\\begin{center}
\\begin{tikzpicture}[x=1cm,y=1cm,>=stealth,scale=0.9]
  \\draw[->] (-3,0) -- (3,0) node[below] {$x$};
  \\draw[->] (0,-2) -- (0,3) node[left] {$y$};
  \\draw[fill=black] (0,0) circle (1.5pt) node[below left] {$O$};
  \\draw[thick,blue,domain=-2.1:2.1,samples=100] plot (\\x, {(\\x)^3 - 3*(\\x)});
  \\draw[dashed] (1,0) node[above] {$1$} -- (1,-2) -- (0,-2) node[left] {$-2$};
  \\draw[dashed] (-1,0) node[below] {$-1$} -- (-1,2) -- (0,2) node[right] {$2$};
\\end{tikzpicture}
\\end{center}
Hàm số đã cho đồng biến trên khoảng nào dưới đây?
\\choice
{$( -1; 1 )$}
{\\True $( 1; +\\infty )$}
{$( -\\infty; 1 )$}
{$( 0; 2 )$}
\\loigiai{
Dựa vào đồ thị hàm số $y = f(x)$, ta thấy trên khoảng $( 1; +\\infty )$ đồ thị đi lên từ trái sang phải, suy ra hàm số đồng biến trên $( 1; +\\infty )$.
}
\\end{ex}

\\begin{ex}%[2H1B1-2]
Cho hình chóp $S.ABC$ có đáy $ABC$ là tam giác vuông cân tại $B$, $AB = a$. Cạnh bên $SA$ vuông góc với mặt phẳng đáy và $SA = a\\sqrt{3}$.
\\begin{center}
\\begin{tikzpicture}[scale=0.8,>=stealth]
  \\coordinate (A) at (0,0);
  \\coordinate (B) at (1.5,-1.2);
  \\coordinate (C) at (4.5,0);
  \\coordinate (S) at (0,3.5);
  \\draw[thick] (S) -- (A) -- (B) -- (C) -- (S) -- (B);
  \\draw[dashed,thick] (A) -- (C);
  \\node[left] at (A) {$A$};
  \\node[below] at (B) {$B$};
  \\node[right] at (C) {$C$};
  \\node[above] at (S) {$S$};
  \\draw (0,0.3) -- (0.3,0.3) -- (0.3,0);
\\end{tikzpicture}
\\end{center}
Tính thể tích $V$ của khối chóp $S.ABC$.
\\choice
{$V = \\dfrac{a^3\\sqrt{3}}{2}$}
{$V = a^3\\sqrt{3}$}
{\\True $V = \\dfrac{a^3\\sqrt{3}}{6}$}
{$V = \\dfrac{a^3\\sqrt{3}}{3}$}
\\loigiai{
Diện tích đáy là tam giác vuông cân: $S_{\\Delta ABC} = \\dfrac{1}{2}AB \\cdot BC = \\dfrac{a^2}{2}$.\\\\
Chiều cao hình chóp $h = SA = a\\sqrt{3}$.\\\\
Thể tích khối chóp là:
\\[ V = \\dfrac{1}{3} S_{\\Delta ABC} \\cdot h = \\dfrac{1}{3} \\cdot \\dfrac{a^2}{2} \\cdot a\\sqrt{3} = \\dfrac{a^3\\sqrt{3}}{6}. \\]
}
\\end{ex}

\\begin{ex}%[2D2B1-3]
Cho hàm số $f(x) = x^4 - 2x^2 + 3$. Xét tính đúng/sai của các mệnh đề sau:
\\choiceTF
{\\True a) Đạo hàm của hàm số là $f'(x) = 4x^3 - 4x$.}
{b) Hàm số có đúng một điểm cực trị.}
{\\True c) Giá trị nhỏ nhất của hàm số trên $\\mathbb{R}$ bằng $2$.}
{d) Đồ thị hàm số cắt trục hoành tại $4$ điểm phân biệt.}
\\loigiai{
Ta có $f'(x) = 4x^3 - 4x = 4x(x^2 - 1) = 0 \\Leftrightarrow \\hoac{x = 0 \\\\ x = \\pm 1}$.\\\\
Do đó hàm số có 3 điểm cực trị (mệnh đề b sai).\\\\
Bảng xét dấu $f'(x)$ cho thấy giá trị cực tiểu đạt tại $x = \\pm 1$ là $f(\\pm 1) = 1 - 2 + 3 = 2$, đây cũng là GTNN trên $\\mathbb{R}$ (mệnh đề c đúng).\\\\
Vì $f(x) \\ge 2 > 0, \\forall x \\in \\mathbb{R}$ nên đồ thị không cắt trục hoành (mệnh đề d sai).
}
\\end{ex}

\\begin{ex}%[2D3Y2-1]
Tìm tập nghiệm của hệ phương trình $\\heva{2x + y = 5 \\\\ x - 3y = -1}$. Biết nghiệm là $(x_0; y_0)$, hãy tính giá trị của $T = x_0 + 2y_0$.
\\shortans{4}
\\loigiai{
Giải hệ phương trình bằng phương pháp cộng đại số:
\\[ \\heva{2x + y = 5 \\\\ x - 3y = -1} \\Leftrightarrow \\heva{6x + 3y = 15 \\\\ x - 3y = -1} \\Leftrightarrow \\heva{7x = 14 \\\\ y = 5 - 2x} \\Leftrightarrow \\heva{x = 2 \\\\ y = 1}. \\]
Vậy nghiệm là $(x_0; y_0) = (2; 1)$. Khi đó $T = 2 + 2(1) = 4$.
}
\\end{ex}`,
  },
  {
    id: 'hinh-hoc-oxyz',
    title: 'Hình học & Đại số (Có TikZ hình tròn & vector)',
    description: 'Ví dụ về hình học giải tích Oxyz, vector \\vec{u}, góc, và đường tròn lượng giác TikZ.',
    latex: `\\begin{ex}%[2H3B2-1]
Trong không gian $Oxyz$, cho mặt cầu $(S): (x-1)^2 + (y-2)^2 + (z+1)^2 = 9$.
\\begin{center}
\\begin{tikzpicture}[scale=0.9]
  \\draw[thick] (0,0) circle (1.8cm);
  \\draw[dashed] (-1.8,0) arc (180:0:1.8cm and 0.5cm);
  \\draw[thick] (-1.8,0) arc (180:360:1.8cm and 0.5cm);
  \\coordinate (I) at (0,0);
  \\fill[red] (I) circle (2pt) node[above left] {$I(1;2;-1)$};
  \\draw[->,blue,thick] (I) -- (1.27,1.27) node[midway,above left] {$R=3$};
\\end{tikzpicture}
\\end{center}
Tọa độ tâm $I$ và bán kính $R$ của mặt cầu $(S)$ lần lượt là:
\\choice
{$I(-1;-2;1), R = 9$}
{\\True $I(1;2;-1), R = 3$}
{$I(1;2;-1), R = 9$}
{$I(-1;-2;1), R = 3$}
\\loigiai{
Mặt cầu $(x-a)^2 + (y-b)^2 + (z-c)^2 = R^2$ có tâm $I(a;b;c)$ và bán kính $R$.\\\\
Ở đây $(a;b;c) = (1;2;-1)$ và $R^2 = 9 \\Rightarrow R = 3$.
}
\\end{ex}`,
  },
  {
    id: 'bang-bien-thien-tkztab',
    title: 'Mẫu Bảng biến thiên (tkz-tab)',
    description: 'Bao gồm bảng biến thiên hàm phân thức có tiệm cận và bảng xét dấu đạo hàm sử dụng tkz-tab.',
    latex: `\\begin{ex}%[2D1B2-1]
Cho hàm số $y = \\dfrac{2x - 1}{x + 1}$. Bảng biến thiên của hàm số đã cho là hình vẽ dưới đây:
\\begin{center}
\\begin{tikzpicture}
\\tkzTabInit[lgt=1.2,espcl=2.5]{$x$/1,$y'$/1,$y$/2}{$-\\infty$,$-1$,$+\\infty$}
\\tkzTabLine{,+,d,+,}
\\tkzTabVar{-/$2$,+D-/$+\\infty$/$-\\infty$,+/$2$}
\\end{tikzpicture}
\\end{center}
Khẳng định nào sau đây là đúng?
\\choice
{Hàm số đồng biến trên $\\mathbb{R} \\setminus \\{-1\\}$}
{\\True Hàm số đồng biến trên mỗi khoảng $(-\\infty; -1)$ và $(-1; +\\infty)$}
{Hàm số nghịch biến trên từng khoảng xác định}
{Hàm số có điểm cực trị tại $x = -1$}
\\loigiai{
Tập xác định: $D = \\mathbb{R} \\setminus \\{-1\\}$.\\\\
Ta có: $y' = \\dfrac{2(1) - (-1)(1)}{(x + 1)^2} = \\dfrac{3}{(x + 1)^2} > 0, \\forall x \\ne -1$.\\\\
Do đó hàm số đồng biến trên từng khoảng $(-\\infty; -1)$ và $(-1; +\\infty)$.
}
\\end{ex}

\\begin{ex}%[2D1Y1-2]
Cho hàm số bậc ba $y = ax^3 + bx^2 + cx + d$ có bảng xét dấu của đạo hàm $y'$ như sau:
\\begin{center}
\\begin{tikzpicture}
\\tkzTabInit[lgt=1.2,espcl=2.5]{$x$/1,$y'$/1}{$-\\infty$,$-2$,$3$,$+\\infty$}
\\tkzTabLine{,-,0,+,0,-,}
\\end{tikzpicture}
\\end{center}
Điểm cực tiểu của hàm số đã cho là:
\\choice
{$x = 3$}
{\\True $x = -2$}
{$x = 0$}
{$x = -1$}
\\loigiai{
Đạo hàm $y'$ đổi dấu từ âm sang dương khi qua điểm $x = -2$, do đó $x = -2$ là điểm cực tiểu của hàm số.
}
\\end{ex}`,
  },
  {
    id: 'bang-thong-ke-tabular',
    title: 'Mẫu Bảng dữ liệu thống kê (tabular)',
    description: 'Bao gồm bảng tần số ghép nhóm thống kê và bảng phân phối xác suất sử dụng môi trường tabular.',
    latex: `\\begin{ex}%[0D5B1-1]
Điểm kiểm tra môn Toán của nhóm gồm $40$ học sinh lớp 12 được ghi lại trong bảng tần số ghép nhóm sau:
\\begin{center}
\\begin{tabular}{|c|c|c|c|c|}
\\hline
\\textbf{Nhóm điểm} & $[5; 6)$ & $[6; 7)$ & $[7; 8)$ & $[8; 10]$ \\\\
\\hline
\\textbf{Số học sinh} & $6$ & $14$ & $12$ & $8$ \\\\
\\hline
\\end{tabular}
\\end{center}
Khoảng biến thiên $R$ của mẫu số liệu ghép nhóm trên là:
\\choice
{$R = 4$}
{$R = 6$}
{\\True $R = 5$}
{$R = 3$}
\\loigiai{
Khoảng biến thiên của mẫu số liệu ghép nhóm là hiệu số giữa đầu mút phải của nhóm cuối cùng và đầu mút trái của nhóm đầu tiên:\\\\
$R = 10 - 5 = 5$.
}
\\end{ex}

\\begin{ex}%[2D5B2-1]
Một biến ngẫu nhiên rời rạc $X$ có bảng phân phối xác suất như sau:
\\begin{center}
\\begin{tabular}{|c|c|c|c|}
\\hline
$X$ & $1$ & $2$ & $3$ \\\\
\\hline
$P(X=x)$ & $0{,}2$ & $0{,}5$ & $0{,}3$ \\\\
\\hline
\\end{tabular}
\\end{center}
Kỳ vọng $E(X)$ của biến ngẫu nhiên $X$ bằng:
\\choice
{$1{,}8$}
{\\True $2{,}1$}
{$2{,}0$}
{$2{,}5$}
\\loigiai{
Kỳ vọng của biến ngẫu nhiên $X$ được tính theo công thức:\\\\
$E(X) = 1 \\cdot 0{,}2 + 2 \\cdot 0{,}5 + 3 \\cdot 0{,}3 = 0{,}2 + 1{,}0 + 0{,}9 = 2{,}1$.
}
\\end{ex}`,
  },
];
