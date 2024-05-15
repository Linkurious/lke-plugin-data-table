@Library('linkurious-shared')_

nodeJob {
  // General
  projectName = "linkurious/lke-plugin-data-table"
  podTemplateNames = ['jnlp-agent-node']  
  runUnitTests = false
  runE2eTests = false

  createGitTag = true
  gitTagPrefix = 'v'
  runBookeeping = true

  //static asset upload
  runPrivateNpmPublish = false
  binaries = ["lke-plugin-data-table.lke"]
  groupId = 'com.linkurious.plugins'

  githubRelease = true

}
