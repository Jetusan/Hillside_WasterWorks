const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DB_PATH = path.join(os.homedir(), 'AppData', 'Roaming', 'hillside-app', 'billing.db');

// Admin user data
const ADMIN = {
    username: 'admin',
    email: 'admin@waterdistrict.com',
    password: 'Admin@123',
    full_name: 'System Administrator',
    role: 'admin'
};

// All 173 customers
const CUSTOMERS = [
    ['A1', '140107817', 'Zamora, Nestor'],
    ['A2', '211013464', 'Montecino, Gerlie'],
    ['A3', '211018130', 'Feleo, Renante'],
    ['A4', '20240503933', 'Cuyos, Mylene'],
    ['A5', 'A-UNMTR-001', 'Simbahan'],
    ['A6', '211014145', 'Cambarijan, Jhonmar'],
    ['A7', 'A-UNMTR-002', 'Liberty, Patricio'],
    ['A8', '211020666', 'Dela Rosa, Regino'],
    ['A9', '210507335', 'Arthur, Ayon Jr.'],
    ['A10', '211018999', 'Batiancila, Jane'],
    ['A11', '20240503657', 'Prendingue, Ruel'],
    ['A12', 'A-UNMTR-003', 'Doong, Wildfredo'],
    ['A13', '180804618', 'Purog, Rosalie'],
    ['A14', '210300177', 'Cabarse, Miguel'],
    ['A15', '2020050450', 'Cesar, Krystel Mae'],
    ['A16', '141200373', 'Cesar, Ramil'],
    ['A17', '90914206', 'Taculad, Carlito'],
    ['A18', '180901556', 'Zamora, Arnold'],
    ['A19', '2020109805', 'Zamora, Alfie'],
    ['A20', '150902374', 'Armonio, Edgardo'],
    ['A21', 'A-UNMTR-004', 'Purok Hall'],
    ['A22', '150903315', 'Pasigna, Archie'],
    ['A23', 'A-UNMTR-005', 'Dela Peña, Rhonalyn'],
    ['A24', '171200007', 'Lejarso, Rose Marie'],
    ['A25', 'A-UNMTR-006', 'Ibo, Rhodelyn'],
    ['A26', '150902597', 'Mondares, Raul'],
    ['A27', 'A-UNMTR-007', 'Grana, Zaldy'],
    ['A28', '2000810531', 'Solmeron, Dominador'],
    ['A29', 'A-UNMTR-008', 'Grana, Henle Val'],
    ['A30', '160508703', 'Ariola, Margie'],
    ['A31', 'A-UNMTR-009', 'Maata, Cecilia'],
    ['A32', '170103694', 'Sinangote, Julieven'],
    ['A33', '2017013019', 'Ursabia, Joel'],
    ['A34', '170100788', 'Sinangote, Danilo'],
    ['A35', 'A-UNMTR-010', 'Nosotros, Joven Roy'],
    ['A36', 'A-UNMTR-011', 'Doong, Roselyn'],
    ['A37', '976422', 'Felix, Lebita'],
    ['A38', '170100775', 'Inot, Romeo'],
    ['A39', 'A-UNMTR-012', 'Maldecir, Roan'],
    ['A40', 'A-UNMTR-013', 'Sinangote, Elvie'],
    ['A41', 'A-UNMTR-014', 'Esconia, Otilo'],
    ['A42', '211021176', 'Tumabini, Rogelia'],
    ['A43', '2410264938', 'Tumulak, Rogelio'],
    ['A44', 'A-UNMTR-015', 'Alimes, Rene'],
    ['A45', '210732076', 'Espora, Annalie'],
    ['A46', '20240500315', 'Sarmiento, Dexter'],
    ['A47', '16083526', 'Cambarijan, Rolando'],
    ['A48', '151003604', 'Cambarijan, Florencio'],
    ['A49', '20240500080', 'Lejarso, Amaluna'],
    ['A50', '20240504482', 'Yap, Sweethelda'],
    ['A51', '20240504335', 'Pablo, Joan'],
    ['A52', '2024054332', 'Digusen, Suharto'],
    ['B1', '170100785', 'Nosotros, Genevie'],
    ['B2', '201881082', 'Casuna, Alexander'],
    ['B3', '140108394', 'Besinga, Loreto'],
    ['B4', '180146573', 'Albos, Tesie'],
    ['B5', '170900652', 'Arancon, Boy'],
    ['B6', '160508704', 'Morales, Willy'],
    ['B7', '160608742', 'Gongob, Joel'],
    ['B8', '170201327', 'Alimes, Jerson'],
    ['B9', '170100783', 'Albos, Jeffty'],
    ['C1', '18010300', 'Lejarso, Carlos'],
    ['C2', '190900551', 'Lejarso, Augustin'],
    ['C3', '19099009', 'Cerezo, Rose Lanie'],
    ['C4', '20240504273', 'Zaldariaga, Florencio'],
    ['C5', '170306504', 'Borja, Noel'],
    ['C6', '180824768', 'Arquio, Roselle'],
    ['C7', '5609', 'Lejarso, Shiela Mae'],
    ['C8', '18-0824762', 'Montecalvo, Jackylo'],
    ['C9', '20080977', 'Olaybal, Amorsolo'],
    ['C10', '190101020', 'Mercado, Rowena'],
    ['C11', '180824761', 'Olaybal, Adrian'],
    ['C12', '1004', 'Granada, Vicente'],
    ['C14', '2019083382', 'Dabucol, Jhon Mark'],
    ['C15', '19010105', 'Granada, Sheena Ezza'],
    ['C16', '170101892', 'Delos Santos, Marvin'],
    ['C17', '20415851', 'Granada, Jesus'],
    ['C18', '201101208', 'Cutamura, Carlito'],
    ['C19', '20211024573', 'Cutamura, Reynaldo'],
    ['C20', '2021107516', 'Cutamura, Tomas'],
    ['C22', '180133503', 'Mengo, Leonides'],
    ['C23', '94669410641', 'Malalis, Geraldine'],
    ['C24', '6600980', 'Samaniego, Melecio'],
    ['C25', 'C-UNMTR-001', 'Samaniego, Eddie'],
    ['C26', '2012060093', 'Cainap, Ruel'],
    ['C27', '20231101626', 'Piodos, Elmer'],
    ['C28', '2016100645', 'Duates, Asucena'],
    ['C29', '140903769', 'Jacinto, Rowena'],
    ['C30', '283168', 'Pagsugiron, Felly'],
    ['C31', 'C-UNMTR-002', 'Samaniego, Diogracias'],
    ['C32', '20240502381', 'Carton, Jocelyn'],
    ['C33', '211019041', 'Olmillo, Victoriano'],
    ['C34', '20240504037', 'Mari, Christina'],
    ['C35', '20240504412', 'Lasawang, Dioleto'],
    ['C36', '211019502', 'Panado, Jayson'],
    ['C37', '20240504268', 'Arcebes, Aires'],
    ['C38', '20240418688', 'Cabases, Rose Mae'],
    ['C39', '20240503440', 'Nunday, Richard'],
    ['C40', '20240503874', 'Lumba, Edwin'],
    ['C41', '20240502338', 'Butil, Clariza'],
    ['C42', '20240418378', 'Alvarez, Luen Rey'],
    ['C43', '20240502133', 'Literal, Jerome'],
    ['C44', '20240503346', 'Minguito, Jovert'],
    ['C45', '20240418459', 'Berondo, Celyn'],
    ['C46', '20250716825', 'Apostol, Kyla Khey'],
    ['C47', '20250716331', 'Guillermo, Myrna'],
    ['C48', '250705510', 'Batacandolo, Sherwin'],
    ['C49', '20250716194', 'Maturan, Michael'],
    ['C50', '20250716387', 'Marjorada, Renald'],
    ['D1', '170100775', 'Villas, Roger'],
    ['D2', 'D-UNMTR-001', 'Lejarso, Edgar'],
    ['D3', '211020650', 'Ursabia, Jenny'],
    ['D4', '211022320', 'Dinolang, Michael Adreian'],
    ['D5', '211016568', 'Venturan, Rommel'],
    ['D6', '160997', 'Dela Peña, Gabriel'],
    ['D7', '180139941', 'Dela Peña, Rhoderick'],
    ['D8', '202008310', 'Base, Danny'],
    ['D9', '190100621', 'Villas, Elsa'],
    ['D10', 'D-UNMTR-002', 'Pague, Bitoon'],
    ['D11', 'D-UNMTR-003', 'Macapanas, Karen Ann'],
    ['D12', '2020109811', 'Tabamo, Jona'],
    ['D13', '211022359', 'Delos Santos, Jerry'],
    ['D14', '211014138', 'Buloc-Buloc, Junifer'],
    ['D15', '21102067', 'Roberto, Anicito'],
    ['D16', '211017661', 'De Vira, Joan Y'],
    ['E1', '20231105682', 'Cambarijan, Dannilo'],
    ['E2', '20231107007', 'Cambarijan, Rudy'],
    ['E3', '20231103991', 'Buslon, Josefina'],
    ['E4', '20220407828', 'Cambarijan, Buenaventura'],
    ['E5', '20240500342', 'Arostique, Amalia'],
    ['E6', '211022401', 'Gonzales, Ma. Agnes'],
    ['E7', 'E-UNMTR-001', 'Pino, Ma. Estela'],
    ['E8', '211022323', 'Basarte, Reynaldo'],
    ['E9', '20240500316', 'Cedeño, Roniel'],
    ['E10', '20231105001', 'Cambarijan, Angelito'],
    ['E11', '20240504369', 'Gonzales, Allan'],
    ['E12', '211022405', 'Baja, Ronald'],
    ['E13', '20240504251', 'Pino, Rodella'],
    ['E14', '211019946', 'Mondares, Mariano'],
    ['E15', '20240500668', 'Lutche, Bunjon Floyd'],
    ['E16', '20240503216', 'Agayan, Michael'],
    ['E17', '20240504385', 'Francisco, Perly'],
    ['E18', '20240500673', 'Malabago, Marilou'],
    ['E19', '202405003115', 'Veronica, Pamintuan'],
    ['E20', 'E-UNMTR-002', 'Malabago, Robert'],
    ['E21', '2024050903', 'Magtana, Richard']
];

async function seedDatabase() {
    console.log('🗑️  Deleting old database...');
    if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
    }
    
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    
    console.log('📁 Creating tables...');
    
    // Users table
    db.run(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            role VARCHAR(20) DEFAULT 'staff',
            is_active INTEGER DEFAULT 1,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TIMESTAMP,
            last_login TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Customers table
    db.run(`
        CREATE TABLE customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cluster VARCHAR(20) NOT NULL,
            meter_number VARCHAR(50) UNIQUE NOT NULL,
            customer_name VARCHAR(100) NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Bills table
    db.run(`
        CREATE TABLE bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            invoice_number VARCHAR(50) UNIQUE NOT NULL,
            previous_reading DECIMAL(10,2) DEFAULT 0,
            current_reading DECIMAL(10,2) DEFAULT 0,
            usage_cubic_meter DECIMAL(10,2) DEFAULT 0,
            gross_amount DECIMAL(10,2) DEFAULT 0,
            discount DECIMAL(10,2) DEFAULT 0,
            net_amount DECIMAL(10,2) DEFAULT 0,
            penalty DECIMAL(10,2) DEFAULT 0,
            arrears DECIMAL(10,2) DEFAULT 0,
            total_amount_due DECIMAL(10,2) DEFAULT 0,
            amount_paid DECIMAL(10,2) DEFAULT 0,
            billing_date DATE NOT NULL,
            billing_period VARCHAR(20),
            due_date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'Unpaid',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    `);
    
    // Payments table
    db.run(`
        CREATE TABLE payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            payment_date DATE NOT NULL,
            or_number VARCHAR(50) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    `);
    
    // Payment allocations table
    db.run(`
        CREATE TABLE payment_allocations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_id INTEGER NOT NULL,
            bill_id INTEGER NOT NULL,
            amount_applied DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (payment_id) REFERENCES payments(id),
            FOREIGN KEY (bill_id) REFERENCES bills(id)
        )
    `);
    
        console.log('🔐 Inserting admin user...');
        const adminHash = await bcrypt.hash(ADMIN.password, 10);
        db.run(`
            INSERT INTO users (username, email, password_hash, full_name, role)
            VALUES (?, ?, ?, ?, ?)
        `, [ADMIN.username, ADMIN.email, adminHash, ADMIN.full_name, ADMIN.role]);
        
        console.log('👥 Inserting 173 customers...');
        console.log('👥 Inserting customers...');
        for (const [cluster, meter, name] of CUSTOMERS) {
            db.run(`INSERT OR IGNORE INTO customers (cluster, meter_number, customer_name) VALUES (?, ?, ?)`,
                [cluster, meter, name]);
        }
        
        // Save to disk
        const data = db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
        
        console.log('✅ Database seeded successfully!');
        console.log('📁 Location:', DB_PATH);
        console.log('🔑 Admin login: admin / Admin@123');
        console.log('👥 Customers:', CUSTOMERS.length);
        
        db.close();
}

seedDatabase().catch(console.error);