# 🐾 Refugio Animal Descentralizado

Programa de gestión de refugios animales desarrollado con **Rust + Anchor** y desplegado en **Solana Devnet**.

## Descripción

Proyecto que busca apoyar la gestión de refugios mediante tecnología blockchain. Permite registrar refugios y mascotas, almacenar información relacionada con su salud y controlar su estado de adopción.

## Program ID — Solana Devnet

`5LKxowtk3ZLgN5ZXQXyu9aD5iNoRBRgHxJeHL1eHAfJP`

**Consultar programa en Solana Explorer:**

https://explorer.solana.com/address/5LKxowtk3ZLgN5ZXQXyu9aD5iNoRBRgHxJeHL1eHAfJP?cluster=devnet

## Funciones del programa

| Instrucción | Descripción |
|---|---|
| `crear_refugio` | Crea una cuenta de refugio mediante PDA. |
| `agregar_mascota` | Registra una mascota con sus datos. |
| `eliminar_mascota` | Elimina el registro de una mascota. |
| `alternar_adopcion` | Cambia el estado de adopción de una mascota. |

## Información de las mascotas

El programa contempla información relacionada con:

- Nombre y edad.
- Estado de salud.
- Necesidad de esterilización.
- Condición de animal mayor.
- Estado de adopción.
- Tiempo que lleva esperando ser adoptada.

## Tecnologías

- Rust
- Anchor Framework
- Solana Devnet
- Solana Playground

## Cuentas PDA

El programa utiliza direcciones derivadas de programa (PDA) para organizar las cuentas:

- Refugio: derivado de la dirección del propietario.
- Mascota: derivada de la cuenta del refugio y el nombre de la mascota.

## Cómo utilizar en Solana Playground

1. Abrir [Solana Playground](https://beta.solpg.io/).
2. Importar el código del programa.
3. Seleccionar el entorno Devnet.
4. Ejecutar Build.
5. Desplegar el programa.
6. Interactuar con las instrucciones disponibles.

## Estado del proyecto

- Programa compilado correctamente.
- Despliegue realizado en Solana Devnet.
- Program ID actualizado.
- Código fuente disponible en este repositorio.

## Objetivo

Utilizar herramientas descentralizadas para contribuir a la gestión, protección y adopción responsable de animales en refugios.