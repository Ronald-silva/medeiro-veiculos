import { readdir, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import sharp from 'sharp'
import imagemin from 'imagemin'
import imageminWebp from 'imagemin-webp'

const INPUT_DIR = 'public'
const OUTPUT_DIR = 'public/optimized'

async function optimizeImages() {
  try {
    // Criar diretório de saída se não existir
    await mkdir(OUTPUT_DIR, { recursive: true })

    // Ler todos os arquivos do diretório de entrada
    const files = await readdir(INPUT_DIR, { recursive: true })
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png)$/i.test(file))

    console.log(`🔍 Encontradas ${imageFiles.length} imagens para otimizar...`)

    for (const file of imageFiles) {
      const inputPath = join(INPUT_DIR, file)
      const outputPath = join(OUTPUT_DIR, file.replace(/\.[^.]+$/, '.webp'))

      // Criar diretório de saída para cada subdiretório
      await mkdir(dirname(outputPath), { recursive: true })

      // Otimizar e converter para WebP
      await sharp(inputPath)
        .resize(1920, 1080, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toFile(outputPath)

      console.log(`✅ Otimizada: ${file} -> ${outputPath}`)
    }

    // Comprimir ainda mais com imagemin
    await imagemin([`${OUTPUT_DIR}/**/*.webp`], {
      destination: OUTPUT_DIR,
      plugins: [
        imageminWebp({
          quality: 80,
          method: 6
        })
      ]
    })

    console.log('🎉 Otimização concluída!')
  } catch (error) {
    console.error('❌ Erro durante a otimização:', error)
    process.exit(1)
  }
}

optimizeImages() 