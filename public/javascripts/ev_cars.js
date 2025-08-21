// public/javascripts/ev_cars.js

// Este script contém a lógica de filtragem para a página de veículos elétricos (/electric)
// e a lógica para o modal de contato global.

$(document).ready(function () {
    var url = window.location.href;
    console.log("Current URL:", url);
    var curr = url.split("/")[3]; // Pega a parte da URL após o domínio (ex: "electric", "gas", "financing")

    // Lógica específica para a página de veículos elétricos
    if (curr === "electric") {
        $("#EVs").addClass('active'); // Ativa o link "EVs" na navbar (se existir)

        // IMPORTANTE: Seletores agora são mais específicos, atuando apenas dentro de #ev-filters
        // Certifique-se de que sua página electric_index.hbs tem um div com id="ev-filters"
        // envolvendo os controles de filtro.

        // Price Filtering for electric cars
        var price_filter_ev = $("#ev-filters .form-check-input");
        price_filter_ev.click((clicked) => {
            var query_param = clicked.target.id;
            var request_url = '/electric/filter/?priceBy=' + query_param;
            console.log("Electric Price Filter URL:", request_url);
            window.location.href = request_url;
        });

        var price_filter_range_ev = $("#ev-filters #formControlRangePrice");
        price_filter_range_ev.change(() => {
            var query_param = "under" + price_filter_range_ev.val();
            var request_url = '/electric/filter/?priceBy=' + query_param;
            console.log("Electric Price Range Filter URL:", request_url);
            window.location.href = request_url;
        });

        // Year Filtering for electric cars
        var year_filter_ev = $('#ev-filters .custom-control-input');
        year_filter_ev.change((changed) => {
            var query_param = changed.target.id;
            var request_url = '/electric/filter/?year=' + query_param;
            console.log("Electric Year Filter URL:", request_url);
            window.location.href = request_url;
        });

        var year_filter_range_ev = $('#ev-filters #formControlRangeYear');
        year_filter_range_ev.change(() => {
            var query_param = "year" + year_filter_range_ev.val();
            var request_url = '/electric/filter/?yearLt=' + query_param;
            console.log("Electric Year Range Filter URL:", request_url);
            window.location.href = request_url;
        });

        // Range Filtering for electric cars
        var range_filter_range_ev = $('#ev-filters #formControlRange');
        range_filter_range_ev.change((changed) => {
            var query_param = range_filter_range_ev.val();
            var request_url = '/electric/filter/?rangeLt=' + query_param;
            console.log("Electric Range Filter URL:", request_url);
            window.location.href = request_url;
        });

    } else if (curr === "gas") {
        $("#Gas").addClass('active'); // Ativa o link "Gas" na navbar (se existir)
        // A lógica de filtragem para 'gas' já está no gas_cars.js, então não repetimos aqui.
    }

    // Lógica para o Modal de Contato (global, pois o botão flutuante está em todas as páginas via layout.hbs)
    // Usamos .off('click').on('click') para garantir que o listener seja anexado apenas uma vez
    // e para evitar múltiplos envios se o modal for aberto e fechado várias vezes.
    $('#messageModal').on('show.bs.modal', function (event) {
        $("#sendMessageButton").off('click').on('click', async function(event) {
            event.preventDefault(); // Previne o envio padrão do formulário HTML

            const contactForm = document.getElementById('contactForm');
            const sendMessageButton = document.getElementById('sendMessageButton');
            const messageModal = document.getElementById('messageModal');

            // Validação do formulário HTML5
            if (!contactForm.checkValidity()) {
                contactForm.classList.add('was-validated'); // Adiciona classes de validação do Bootstrap
                return; // Impede o envio se a validação falhar
            }

            // Coleta os dados do formulário
            const name = document.getElementById('contactName').value;
            const email = document.getElementById('contactEmail').value;
            const phone = document.getElementById('contactPhone').value;
            const message = document.getElementById('contactMessage').value;

            const formData = { name, email, phone, message };

            // Feedback visual ao usuário
            const originalButtonText = sendMessageButton.innerHTML;
            sendMessageButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
            sendMessageButton.disabled = true;

            try {
                // Envia os dados para o endpoint do backend
                const response = await fetch('/send-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.redirect) {
                        // Se o backend enviar uma URL de redirecionamento, navega para ela
                        window.location.href = result.redirect;
                    } else {
                        // Fallback: caso não haja redirecionamento (não deve acontecer com a lógica atual)
                        alert('Your message has been sent successfully!'); // Substituir por modal customizado
                        $(messageModal).modal('hide');
                        contactForm.reset();
                        contactForm.classList.remove('was-validated');
                    }
                } else {
                    // Lida com erros da resposta do servidor
                    const errorData = await response.json();
                    alert(`Error sending message: ${errorData.message || response.statusText}`); // Substituir por modal customizado
                }
            } catch (error) {
                // Lida com erros de rede (ex: servidor offline)
                console.error('Network error during message send:', error);
                alert('There was a problem connecting to the server. Please try again later.'); // Substituir por modal customizado
            } finally {
                // Restaura o estado original do botão
                sendMessageButton.innerHTML = originalButtonText;
                sendMessageButton.disabled = false;
            }
        });
    });
});
