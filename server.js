const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;

const db = mysql.createConnection({
    host: process.env["MYSQL-HOST"],
    user: process.env["MYSQL-USER"],
    password: process.env["MYSQL-PASSWORD"],
    database: process.env["MYSQL-DATABASE"],
    port: Number(process.env["MYSQL-PORT"] || 3306)
});

/* =========================
   اختبار MySQL
========================= */

db.connect((err) => {
    if (err) {
        console.error("MYSQL ERROR:");
        console.error(err);
        return;
    }

    console.log("Connected to MySQL");
});

/* =========================
   الصفحة الرئيسية
========================= */

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
   المنتجات
========================= */

app.get("/api/products", (req, res) => {
    db.query("SELECT * FROM products ORDER BY id DESC", (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Database error"
            });
        }

        res.json(results);
    });
});

app.post("/api/products", (req, res) => {
    const { name, price, description } = req.body;

    const sql = `
        INSERT INTO products (name, price, description)
        VALUES (?, ?, ?)
    `;

    db.query(sql, [name, price, description], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Database error"
            });
        }

        res.json({
            message: "تمت إضافة المنتج",
            id: result.insertId
        });
    });
});

app.put("/api/products/:id", (req, res) => {
    const { name, price, description } = req.body;
    const id = req.params.id;

    const sql = `
        UPDATE products
        SET name = ?, price = ?, description = ?
        WHERE id = ?
    `;

    db.query(sql, [name, price, description, id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Database error"
            });
        }

        res.json({
            message: "تم تعديل المنتج"
        });
    });
});

app.delete("/api/products/:id", (req, res) => {
    const id = req.params.id;

    db.query(
        "DELETE FROM products WHERE id = ?",
        [id],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Database error"
                });
            }

            res.json({
                message: "تم حذف المنتج"
            });
        }
    );
});

/* =========================
   إنشاء طلب
========================= */

app.post("/api/orders", (req, res) => {

    const {
        customer_name,
        phone,
        address,
        order_type,
        total,
        items
    } = req.body;

    const customerSql = `
        INSERT INTO customers (name, phone, address)
        VALUES (?, ?, ?)
    `;

    db.query(
        customerSql,
        [customer_name, phone, address],
        (err, customerResult) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Customer database error"
                });
            }

            const customerId = customerResult.insertId;

            const orderSql = `
                INSERT INTO orders
                (customer_id, customer_name, phone, address, order_type, total)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.query(
                orderSql,
                [
                    customerId,
                    customer_name,
                    phone,
                    address,
                    order_type,
                    total
                ],
                (err, orderResult) => {

                    if (err) {
                        console.error(err);
                        return res.status(500).json({
                            error: "Order database error"
                        });
                    }

                    const orderId = orderResult.insertId;

                    if (!items || items.length === 0) {
                        return res.json({
                            message: "تم إنشاء الطلب",
                            orderId
                        });
                    }

                    const values = items.map(item => [
                        orderId,
                        item.product_id,
                        item.quantity,
                        item.price
                    ]);

                    const itemsSql = `
                        INSERT INTO order_items
                        (order_id, product_id, quantity, price)
                        VALUES ?
                    `;

                    db.query(
                        itemsSql,
                        [values],
                        (err) => {

                            if (err) {
                                console.error(err);
                                return res.status(500).json({
                                    error: "Order items database error"
                                });
                            }

                            res.json({
                                message: "تم إنشاء الطلب",
                                orderId
                            });
                        }
                    );
                }
            );
        }
    );
});

/* =========================
   الطلبات
========================= */

app.get("/api/orders", (req, res) => {

    const sql = `
        SELECT *
        FROM orders
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Database error"
            });
        }

        res.json(results);
    });
});

/* =========================
   طلب واحد
========================= */

app.get("/api/orders/:id", (req, res) => {

    const orderId = req.params.id;

    const orderSql = `
        SELECT *
        FROM orders
        WHERE id = ?
    `;

    db.query(orderSql, [orderId], (err, orders) => {

        if (err) {
            console.error(err);
            return res.status(500).json({
                error: "Database error"
            });
        }

        if (orders.length === 0) {
            return res.status(404).json({
                error: "Order not found"
            });
        }

        const itemsSql = `
            SELECT *
            FROM order_items
            WHERE order_id = ?
        `;

        db.query(itemsSql, [orderId], (err, items) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Database error"
                });
            }

            res.json({
                order: orders[0],
                items: items
            });
        });
    });
});

/* =========================
   تحديث حالة الطلب
========================= */

app.put("/api/orders/:id/status", (req, res) => {

    const orderId = req.params.id;
    const { status } = req.body;

    db.query(
        "UPDATE orders SET status = ? WHERE id = ?",
        [status, orderId],
        (err) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Database error"
                });
            }

            res.json({
                message: "تم تحديث حالة الطلب"
            });
        }
    );
});

/* =========================
   تشغيل السيرفر
========================= */

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});