let cart = [];

function addToCart(productId, name, price) {

    const existingProduct = cart.find(item => item.productId === productId);

    if (existingProduct) {
        existingProduct.quantity++;
    } else {
        cart.push({
            productId: productId,
            name: name,
            price: Number(price),
            quantity: 1
        });
    }

    displayCart();
}

function increaseQuantity(index) {
    cart[index].quantity++;
    displayCart();
}

function decreaseQuantity(index) {

    if (cart[index].quantity > 1) {
        cart[index].quantity--;
    } else {
        cart.splice(index, 1);
    }

    displayCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    displayCart();
}

function displayCart() {

    const cartItems = document.getElementById("cart-items");
    const cartTotal = document.getElementById("cart-total");

    cartItems.innerHTML = "";

    let total = 0;

    cart.forEach(function(item, index) {

        const itemTotal = item.price * item.quantity;

        total += itemTotal;

        const itemElement = document.createElement("div");

        itemElement.className = "cart-item";

        itemElement.innerHTML = `
            <strong>${item.name}</strong>

            <p>
                ${item.price.toFixed(2)} د.أ × ${item.quantity}
                = ${itemTotal.toFixed(2)} د.أ
            </p>

            <button onclick="decreaseQuantity(${index})">−</button>
            <button onclick="increaseQuantity(${index})">+</button>
            <button onclick="removeFromCart(${index})">حذف</button>
        `;

        cartItems.appendChild(itemElement);
    });

    cartTotal.textContent = total.toFixed(2);
}

function showCheckout() {

    if (cart.length === 0) {
        alert("🛒 السلة فارغة، أضف منتجًا أولاً.");
        return;
    }

    const checkout = document.getElementById("checkout");

    checkout.style.display = "block";

    checkout.scrollIntoView({
        behavior: "smooth"
    });
}

async function submitOrder() {

    if (cart.length === 0) {
        alert("🛒 السلة فارغة.");
        return;
    }

    const name = document.getElementById("customer-name").value.trim();
    const phone = document.getElementById("customer-phone").value.trim();
    const address = document.getElementById("customer-address").value.trim();
    const orderType = document.getElementById("order-type").value;

    if (name === "") {
        alert("⚠️ اكتب اسم الزبون.");
        return;
    }

    if (phone === "") {
        alert("⚠️ اكتب رقم الهاتف.");
        return;
    }

    if (orderType === "delivery" && address === "") {
        alert("⚠️ اكتب عنوان التوصيل.");
        return;
    }

    let total = 0;

    cart.forEach(function(item) {
        total += item.price * item.quantity;
    });

    const orderData = {
        customerName: name,
        phone: phone,
        address: address,
        orderType: orderType,
        total: total,
        items: cart
    };

    try {

        const response = await fetch("/api/orders", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(orderData)
        });

        const result = await response.json();

        if (!response.ok) {
            alert("❌ حدث خطأ: " + result.error);
            return;
        }

        alert(
            "✅ تم إرسال الطلب بنجاح!\nرقم الطلب: #" +
            result.orderId
        );

        cart = [];

        displayCart();

        document.getElementById("customer-name").value = "";
        document.getElementById("customer-phone").value = "";
        document.getElementById("customer-address").value = "";

    } catch (error) {

        console.error(error);

        alert("❌ تعذر الاتصال بالسيرفر.");
    }
}