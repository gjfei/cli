import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import prompts from 'prompts'

const cwd = process.cwd()

const renameFiles: Record<string, string | undefined> = {
  _gitignore: '.gitignore',
}

const getTemplateList = () => {
  return fs.readdirSync(path.join(cwd, 'template')).map(dir => ({ title: dir, value: dir }))
}

// const getPackageManagerList = () => {
//   return ['npm', 'yarn', 'pnpm'].map(tool => ({ title: tool, value: tool }))
// }

const formatTargetDir = (targetDir: string | undefined) => {
  return targetDir?.trim().replace(/\/+$/g, '')
}

const isEmpty = (path: string) => {
  const files = fs.readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}

function copy(src: string, dest: string) {
  const stat = fs.statSync(src)
  if (stat.isDirectory())
    copyDir(src, dest)

  else
    fs.copyFileSync(src, dest)
}

const run = async () => {
  const defaultTargetDir = 'jarven-project'
  let targetDir = defaultTargetDir

  const result = await prompts([
    {
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: defaultTargetDir,
      onState: (state) => {
        targetDir = formatTargetDir(state.value) || defaultTargetDir
      },
    },
    {
      type: () =>
        !fs.existsSync(targetDir) || isEmpty(targetDir) ? null : 'confirm',
      name: 'overwrite',
      message: `"${targetDir}"不为空，删除现有文件并继续？`,
    },
    {
      type: 'text',
      name: 'packageName',
      message: 'Package name:',
      initial: targetDir,
    },
    // {
    //   type: 'text',
    //   name: 'packageManager',
    //   message: 'Package manager name:',
    //   choices: getPackageManagerList(),
    // },
    {
      type: 'select',
      name: 'template',
      message: 'Template name:',
      choices: getTemplateList(),
    },
  ])

  const root = path.join(cwd, targetDir)

  const templateDir = path.join(cwd, 'template', result.template)

  const write = (file: string, content?: string) => {
    const targetPath = path.join(root, renameFiles[file] ?? file)
    if (content)
      fs.writeFileSync(targetPath, content)

    else
      copy(path.join(templateDir, file), targetPath)
  }
  const files = fs.readdirSync(templateDir)
  for (const file of files.filter(f => f !== 'package.json'))
    write(file)

  const pkg = JSON.parse(
    fs.readFileSync(path.join(templateDir, 'package.json'), 'utf-8'),
  )

  pkg.name = result.packageName

  write('package.json', JSON.stringify(pkg, null, 2))
}

run()
