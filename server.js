const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = mysql.createConnection({
    host: process.env["MYSQL-HOST"],
    user: process.env["MYSQL-USER"],
    password: process.env["MYSQL-PASSWORD"],
    database: process.env["MYSQL-DATABASE"],
    port: Number(process.env["MYSQL-PORT"] || 3306)
});

db.connect((err) => {
    if (err) {
        console.error("MYSQL ERROR:", err);
        process.exit(1);
    }

    console.log("Connected to MySQL");

    startServer();
});

function startServer() {

    app.get("/", (req, res) => {
        res.sendFile(__dirname + "/index.html");
    });

    app.get("/api/products", (req, res) => {
        db.query("SELECT * FROM products ORDER BY id DESC", (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: err.message });
            }

            res.json(results);
        });
    });

    app.post("/api/products", (req, res) => {
        const { name, price, description } = req.body;

        db.query(
            "INSERT INTO products (name, price, description) VALUES (?, ?, ?)",
            [name, price, description],
            (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: err.message });
                }

                res.json({
                    id: result.insertId,
                    name,
                    price,
                    description
                });
            }
        );
    });

    app.put("/api/products/:id", (req, res) => {
        const { name, price, description } = req.body;
        const id = req.params.id;

        db.query(
            "UPDATE products SET name=?, price=?, description=? WHERE id=?",
            [name, price, description, id],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: err.message });
                }

                res.json({ message: "Product updated successfully" });
            }
        );
    });

    app.delete("/api/products/:id", (req, res) => {
        const id = req.params.id;

        db.query(
            "DELETE FROM products WHERE id=?",
            [id],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: err.message });
                }

                res.json({ message: "Product deleted successfully" });
            }
        );
    });

    app.post("/api/orders", (req, res) => {

        const {
            customer_name,
            phone,
            address,
            order_type,
            total,
            items
        } = req.body;

        db.query(
            `INSERT INTO customers (name, phone, address)
             VALUES (?, ?, ?)`,
            [customer_name, phone, address],
            (customerErr, customerResult) => {

                if (customerErr) {
                    console.error(customerErr);
                    return res.status(500).json({
                        error: customerErr.message
                    });
                }

                const customerId = customerResult.insertId;

                db.query(
                    `INSERT INTO orders
                    (customer_id, customer_name, phone, address, order_type, total, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'new')`,
                    [
                        customerId,
                        customer_name,
                        phone,
                        address,
                        order_type,
                        total
                    ],
                    (orderErr, orderResult) => {

                        if (orderErr) {
                            console.error(orderErr);
                            return res.status(500).json({
                                error: orderErr.message
                            });
                        }

                        const orderId = orderResult.insertId;

                        if (!items || items.length === 0) {
                            return res.json({
                                success: true,
                                orderId
                            });
                        }

                        const values = items.map(item => [
                            orderId,
                            item.product_id,
                            item.quantity,
                            item.price
                        ]);

                        db.query(
                            `INSERT INTO order_items
                            (order_id, product_id, quantity, price)
                            VALUES ?`,
                            [values],
                            (itemsErr) => {

                                if (itemsErr) {
                                    console.error(itemsErr);
                                    return res.status(500).json({
                                        error: itemsErr.message
                                    });
                                }

                                res.json({
                                    success: true,
                                    orderId
                                });
                            }
                        );
                    }
                );
            }
        );
    });

    app.get("/api/orders", (req, res) => {

        db.query(
            `SELECT * FROM orders ORDER BY id DESC`,
            (err, results) => {

                if (err) {
                    console.error(err);
                    return res.status(500).json({
                        error: err.message
                    });
                }

                res.json(results);
            }
        );
    });

    app.put("/api/orders/:id/status", (req, res) => {

        const { status } = req.body;
        const id = req.params.id;

        db.query(
            "UPDATE orders SET status=? WHERE id=?",
            [status, id],
            (err) => {

                if (err) {
                    console.error(err);
                    return res.status(500).json({
                        error: err.message
                    });
                }

                res.json({
                    success: true
                });
            }
        );
    });

    app.get("/api/orders/:id", (req, res) => {

        const id = req.params.id;

        db.query(
            "SELECT * FROM orders WHERE id=?",
            [id],
            (orderErr, orders) => {

                if (orderErr) {
                    console.error(orderErr);
                    return res.status(500).json({
                        error: orderErr.message
                    });
                }

                if (orders.length === 0) {
                    return res.status(404).json({
                        error: "Order not found"
                    });
                }

                db.query(
                    `SELECT 
                        order_items.*,
                        products.name,
                        products.description
                     FROM order_items
                     JOIN products
                     ON order_items.product_id = products.id
                     WHERE order_items.order_id=?`,
                    [id],
                    (itemsErr, items) => {

                        if (itemsErr) {
                            console.error(itemsErr);
                            return res.status(500).json({
                                error: itemsErr.message
                            });
                        }

                        res.json({
                            order: orders[0],
                            items
                        });
                    }
                );
            }
        );
    });

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
    });
}