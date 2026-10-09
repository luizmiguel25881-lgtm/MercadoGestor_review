const KEY = 'mercadogestor_products_v1';

const seed = [
    ["7891000100011", "Arroz Branco Tipo 1 5kg", 28.90, "kg", 5, 42, "Camil", "Alimentos", "AR260801", "2026-08-01", "2027-08-01"],
    ["7891000100028", "Feijão Carioca 1kg", 8.49, "kg", 1, 85, "Kicaldo", "Alimentos", "FC260801", "2026-08-01", "2027-02-01"],
    ["7891000100035", "Açúcar Cristal 2kg", 7.99, "kg", 2, 61, "União", "Alimentos", "AC260802", "2026-08-02", "2027-08-02"]
];

let products = JSON.parse(localStorage.getItem(KEY) || 'null');

if (!products) {
    products = seed.map((x, i) => ({
        id: crypto.randomUUID(),
        barcode: x[0],
        name: x[1],
        price: x[2],
        unit: x[3],
        unit_quantity: x[4],
        stock_quantity: x[5],
        brand: x[6],
        type: x[7],
        lot: x[8],
        manufacturing_date: x[9],
        expiration_date: x[10]
    }));

    persist();
}

function persist() {
    localStorage.setItem(KEY, JSON.stringify(products));
}

const fmt = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
});

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

function dateBR(s) {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
}

function daysTo(s) {
    return Math.ceil(
        (new Date(s + 'T00:00:00') - new Date()) / 86400000
    );
}

function status(p) {
    const d = daysTo(p.expiration_date);

    if (d < 0) return '<span class="badge expired">Vencido</span>';
    if (d <= 30) return '<span class="badge low">Próximo</span>';

    return '<span class="badge ok">Válido</span>';
}

function render() {
    document.getElementById('total').textContent = products.length;

    const stockValue = products.reduce(
        (total, p) => total + Number(p.price) * Number(p.stock_quantity),
        0
    );

    document.getElementById('stockValue').textContent = fmt.format(stockValue);

    document.getElementById('lowStock').textContent =
        products.filter(p => Number(p.stock_quantity) <= 10).length;

    document.getElementById('expiring').textContent =
        products.filter(p => {
            const days = daysTo(p.expiration_date);
            return days >= 0 && days <= 30;
        }).length;

    renderTable();
    dashboards();
}

function renderTable() {
    const q = document.getElementById('search').value.toLowerCase();

    const rows = products.filter(p =>
        [p.barcode, p.name, p.brand, p.type, p.lot]
            .some(v => String(v).toLowerCase().includes(q))
    );

    document.getElementById('tbody').innerHTML = rows.length
        ? rows.map(p => `
            <tr>
                <td>${esc(p.barcode)}</td>
                <td><b>${esc(p.name)}</b><br>${status(p)}</td>
                <td>${fmt.format(p.price)}</td>
                <td>${esc(p.unit)}</td>
                <td>${p.unit_quantity}</td>
                <td>${p.stock_quantity}</td>
                <td>${esc(p.brand)}</td>
                <td>${esc(p.type)}</td>
                <td>${esc(p.lot)}</td>
                <td>${dateBR(p.manufacturing_date)}</td>
                <td>${dateBR(p.expiration_date)}</td>
                <td>
                    <button class="secondary" onclick="editProduct('${p.id}')">Editar</button>
                    <button class="danger" onclick="removeProduct('${p.id}')">Excluir</button>
                </td>
            </tr>
        `).join('')
        : '<tr><td colspan="12" class="empty">Nenhum produto encontrado.</td></tr>';
}

function dashboards() {
    const tipos = [...new Set(products.map(p => p.type))];

    const entries = tipos.map(tipo => [
        tipo,
        products.filter(p => p.type === tipo).reduce(
            (total, p) => total + Number(p.stock_quantity), 0
        )
    ]);

    const max = Math.max(...entries.map(([, valor]) => valor), 1);

    document.getElementById('typeBars').innerHTML = entries.map(([tipo, valor]) => `
        <div class="barcol">
            <div class="bar" style="height:${Math.max(8, valor / max * 120)}px"></div>
            <div>${valor}</div>
            <div class="legend">${esc(tipo)}</div>
        </div>
    `).join('');

    const grupos = [
        ['Alimentos', 0],
        ['Bebidas', 0],
        ['Outros', 0],
        ['Baixo estoque', 0]
    ];

    products.forEach(p => {
        const i = ['Alimentos', 'Bebidas'].includes(p.type)
            ? ['Alimentos', 'Bebidas'].indexOf(p.type)
            : 2;

        grupos[i][1]++;

        if (Number(p.stock_quantity) <= 10) {
            grupos[3][1]++;
        }
    });

    const total = products.length || 1;
    const cores = ['#5b4bdb', '#16b364', '#f79009', '#667085'];
    let inicio = 0;

    const stops = grupos.map((g, i) => {
        inicio += g[1] / total * 100;
        return `${cores[i]} ${inicio}%`;
    });

    document.getElementById('donut').style.background =
        `conic-gradient(${stops.join(',')})`;

    document.getElementById('legend').innerHTML = grupos.map((g, i) => `
        <div>
            <i class="dot" style="background:${cores[i]}"></i>
            ${g[0]}: <b>${g[1]}</b>
        </div>
    `).join('');
}

function newProductDisabled() {
    openForm();
}

function openForm(p = null) {
    document.getElementById('form').reset();

    document.getElementById('id').value = p ? p.id : '';

    document.getElementById('modalTitle').textContent =
        p ? 'Editar produto' : 'Cadastrar produto';

    if (p) {
        for (const k of [
            'barcode', 'name', 'price', 'unit',
            'unit_quantity', 'stock_quantity', 'brand',
            'type', 'lot', 'manufacturing_date', 'expiration_date'
        ]) {
            document.getElementById(k).value = p[k];
        }
    }

    document.getElementById('modal').classList.add('open');
}

function closeForm() {
    document.getElementById('modal').classList.remove('open');
}

function editProduct(id) {
    openForm(products.find(p => p.id === id));
}

function saveProduct(e) {
    e.preventDefault();

    const id = document.getElementById('id').value;
    const p = { id: id || crypto.randomUUID() };

    for (const k of [
        'barcode', 'name', 'unit', 'brand', 'type',
        'lot', 'manufacturing_date', 'expiration_date'
    ]) {
        p[k] = document.getElementById(k).value;
    }

    p.price = Number(document.getElementById('price').value);
    p.unit_quantity = Number(document.getElementById('unit_quantity').value);
    p.stock_quantity = Number(document.getElementById('stock_quantity').value);

    if (products.some(x => x.barcode === p.barcode && x.id !== p.id)) {
        toast('Já existe um produto com este código de barras.');
        return;
    }

    if (id) {
        products = products.map(x => x.id === id ? p : x);
    } else {
        products.push(p);
    }

    persist();
    closeForm();
    render();
    toast(id ? 'Produto atualizado!' : 'Produto cadastrado!');
}

function removeProduct(id) {
    const p = products.find(x => x.id === id);

    if (p && confirm(`Excluir "${p.name}"?`)) {
        products = products.filter(x => x.id !== id);
        persist();
        render();
        toast('Produto excluído!');
    }
}

function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');

    setTimeout(() => t.classList.remove('show'), 2500);
}

function exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(products);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
    XLSX.writeFile(workbook, 'relatorio-produtos.xlsx');
}

render();