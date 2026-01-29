export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer */}
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
          {/* Contato */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contato</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://api.whatsapp.com/send?phone=5585920021150"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent"
                >
                  <i className="fab fa-whatsapp mr-2"></i>
                  (85) 92002-1150
                </a>
              </li>
              <li>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Av.+Am%C3%A9rico+Barreira,+909+-+Loja+03,+Fortaleza+-+CE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent inline-block"
                >
                  <i className="fas fa-map-marker-alt mr-2"></i>
                  Av. Américo Barreira, 909 - Loja 03
                </a>
              </li>
            </ul>
          </div>

          {/* Horário de Funcionamento */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Horário de Funcionamento</h3>
            <ul className="space-y-3">
              <li>
                <i className="far fa-clock mr-2"></i>
                Segunda a Sexta: 08h às 18h
              </li>
              <li>
                <i className="far fa-clock mr-2"></i>
                Sábado: 08h às 13h
              </li>
            </ul>
          </div>

          {/* Redes Sociais */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Redes Sociais</h3>
            <p className="text-sm mb-4">
              📢 Acompanhe nossas ofertas exclusivas e avaliações de clientes no Instagram!
            </p>
            <div className="flex justify-center space-x-4">
              <a
                href="https://www.instagram.com/medeiro.veiculos/?igsh=aGt3dHExdWtxdng4"
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xl hover:text-accent transform hover:scale-110 transition-transform duration-200"
                aria-label="Siga Medeiros Veículos no Instagram"
              >
                <i className="fab fa-instagram" aria-hidden="true"></i>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Medeiros Veículos
          </h2>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Medeiros Veículos. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
} 