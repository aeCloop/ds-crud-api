const express = require("express");
const cors = require("cors");
require("dotenv").config();

const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// 1) cria um "pool" de conexões (padrão profissional)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // vazio se não tiver senha
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
});

function isEmailValido(email) {
  return typeof email === "string" && email.includes("@") && email.includes(".");
}

function validarCliente({ nome, email }) {
  if (!nome || typeof nome !== "string" || nome.trim().length < 2) {
    return "Nome é obrigatório (mínimo 2 letras).";
  }
  if (!isEmailValido(email)) {
    return "Email inválido.";
  }
  return null; // ok
}

// 2) rota de teste (server + db)
app.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({ status: "ok", db: rows[0] });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Falha ao conectar no banco",
      error: err.message,
    });
  }
});

// 3) rota: listar clientes do MySQL
app.get("/clientes", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM clientes ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({
      message: "Erro ao buscar clientes",
      error: err.message,
    });
  }
});

app.get("/clientes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const [rows] = await pool.query(
      "SELECT * FROM clientes WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Cliente não encontrado." });
    }

    res.json(rows[0]);

  } catch (err) {
    res.status(500).json({
      message: "Erro ao buscar cliente",
      error: err.message
    });
  }
});

app.delete("/clientes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const [result] = await pool.query("DELETE FROM clientes WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cliente não encontrado." });
    }

    res.json({ message: "Cliente removido com sucesso." });
  } catch (err) {
    res.status(500).json({ message: "Erro ao remover cliente", error: err.message });
  }
});

app.put("/clientes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID inválido." });

    const { nome, email, telefone, data_nascimento } = req.body;

    const erro = validarCliente({ nome, email });
    if (erro) return res.status(400).json({ message: erro });

    const [result] = await pool.query(
      `UPDATE clientes
       SET nome = ?, email = ?, telefone = ?, data_nascimento = ?
       WHERE id = ?`,
      [nome, email, telefone || null, data_nascimento || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cliente não encontrado." });
    }

    res.json({ message: "Cliente atualizado com sucesso." });
  } catch (err) {
    res.status(500).json({ message: "Erro ao atualizar cliente", error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

app.post("/clientes", async (req, res) => {
  try {
    const { nome, email, telefone, data_nascimento } = req.body;
    const erro = validarCliente({ nome, email });
if (erro) return res.status(400).json({ message: erro });
    const [result] = await pool.query(
      "INSERT INTO clientes (nome, email, telefone, data_nascimento) VALUES (?, ?, ?, ?)",
      [nome, email, telefone, data_nascimento]
    );

    res.status(201).json({
      message: "Cliente cadastrado com sucesso",
      id: result.insertId
    });

  } catch (err) {
    res.status(500).json({
      message: "Erro ao cadastrar cliente",
      error: err.message
    });
  }
});