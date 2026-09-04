# Ajustes v2.8 — Administração da Ouvidoria IA

## Novo módulo: Administração → Ouvidoria IA

O Portal passa a ser a fonte central de configuração da extensão OuvidorSUS.

### O que fica no D1 do Portal
- cadastro dos profissionais;
- código técnico estável do profissional;
- nome exato exibido no OuvidorSUS;
- e-mail institucional;
- regras de distribuição;
- prioridade das regras;
- ordem de fallback;
- limite mínimo de confiança da classificação.

### O que NÃO fica no D1 do Portal
- manifestações;
- teor das manifestações;
- resumos por IA;
- protocolos;
- PDFs de envio;
- CPF dos profissionais usado pelo endpoint do OuvidorSUS.

A extensão continua mantendo as manifestações apenas em armazenamento temporário de sessão.

## Regras iniciais
- Odontologia técnica → Ariane (prioridade 10)
- Odontologia geral → Beatriz (prioridade 20)
- 1º fallback → Herbet
- 2º fallback → Luiz
- confiança mínima inicial → 80%

Os nomes exatos no OuvidorSUS e e-mails ficam inicialmente em branco para evitar presumir dados não confirmados.
