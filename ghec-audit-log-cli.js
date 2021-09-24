#! /usr/bin/env node
const YAML = require('yaml')
const fs = require('fs')
const { Octokit } = require('@octokit/rest')
const { enterpriseCloud } = require('@octokit/plugin-enterprise-cloud')
const { requestV4Entries, requestV3Entries } = require('./ghec-audit-log-client')
const { retry } = require('@octokit/plugin-retry')
const { throttling } = require('@octokit/plugin-throttling')
const { validateInput } = require('./ghec-audit-log-utils')

// Obtain configuration
const { program } = require('commander')
const mypackage = require('./package.json')
program.version(mypackage.version, '-v, --version', 'Output the current version')
  .option('-t, --token <string>', 'the token to access the API (mandatory)')
  .option('-o, --org <string>', 'the organization we want to extract the audit log from')
  .option('-cfg, --config <string>', 'location for the config yaml file. Default ".ghec-audit-log"', './.ghec-audit-log')
  .option('-p, --pretty', 'prints the json data in a readable format', false)
  .option('-l, --limit <number>', 'a maximum limit on the number of items retrieved')
  .option('-f, --file <string>', 'the output file where the result should be printed')
  .option('-a, --api <string>', 'the version of GitHub API to call', 'v4')
  .option('-at, --api-type <string>', 'Only if -a is v3. API type to bring, either all, web or git', 'all')
  .option('-c, --cursor <string>', 'if provided, this cursor will be used to query the newest entries from the cursor provided. If not present, the result will contain all the audit log from the org')
  .option('-s, --source <string>', 'the source of the audit log. The source can ' +
    'be either a GitHub Enterprise or a GitHub Enterprise Organization. ' +
    'Accepts the following values: org | enterprise. Defaults to org', 'org')
program.parse(process.argv)

const configLocation = program.cfg || './.ghec-audit-log'
let config = {}
try {
console.log(` proccess try `)
  config = YAML.parse(fs.readFileSync(configLocation, 'utf8'))
} catch (e) {
console.log(` proccess catch (e) `)
  console.log(`${configLocation} file missing. Path parameters will apply`)
}

// TODO idea: maybe add support for other formats like PUTVAL to forward the data in an easier way
const { cursor, pretty, limit, api, apiType, token, org, outputFile, source } = validateInput(program, config)
console.log(` proccess validateInput(program, config) `)

function buildGitHubClient () {
console.log(` proccess function buildGitHubClient start `)
  const Octo = Octokit.plugin(retry, throttling)
  const EnterpiseOcto = Octo.plugin(enterpriseCloud)

  const octokit = new EnterpiseOcto({
    auth: token,
    throttle: {
      onRateLimit: (retryAfter, _) => {
        octokit.log.warn(
          `[${new Date().toISOString()}] ${program} Request quota exhausted for request, will retry in ${retryAfter}`
        )
        return true
      },
      onAbuseLimit: (retryAfter, _) => {
        octokit.log.warn(
          `[${new Date().toISOString()}] ${program} Abuse detected for request, will retry in ${retryAfter}`
        )
        return true
      }
    }
  })
  return octokit
}

/**
 * Function containing the GitHub API v4 Graphql calls for the audit log
 */
console.log(` start proccess async function queryAuditLog () befor`)
async function queryAuditLog () {
console.log(` start proccess async function queryAuditLog () after`)
  // Select the query to run
  let queryRunner
console.log(` proccess buildGitHubClient()　befor `)
  const github = buildGitHubClient()
console.log(` proccess buildGitHubClient()　after `)
  switch (api) {
    case 'v4': // API v4 call with cursor
console.log(` proccess v4 `)
      queryRunner = () => requestV4Entries(github, org, limit, cursor || null)
      break
    case 'v3': // API v3 call with cursor
console.log(` proccess v3 `)
      queryRunner = () => requestV3Entries(github, org, limit, cursor || null, apiType, source)
      break
  }

  // Sanity check the switch
  if (!queryRunner) return []

  // Run the query and store the most recent cursor
  //const { data, newestCursorId } = await queryRunner()
  //const entries = data
  //if (newestCursorId) {
    const cursorFileName = `.last${api === 'v3' ? '-v3-' : '-'}cursor-update`
//    fs.writeFileSync(cursorFileName, newestCursorId)
    fs.writeFileSync(cursorFileName, cursorFileName)
console.log(` proccess point 92line writeFileSync `)
  //}

  // Return the data
  if (pretty === true) {
console.log(` proccess pretty === true `)
    return JSON.stringify(entries, null, 4)
  } else {
console.log(` proccess else `)
    return JSON.stringify(entries)
  }
}

/*
* Logic to see if we need to run the API v3 vs API v4
*/
console.log(` proccess queryAuditLog()　befor `)
queryAuditLog()
  .then((data) => {
console.log(` proccess queryAuditLog()　after `)
    if (outputFile) {
console.log(` proccess if (outputFile) `)
      fs.writeFileSync(outputFile, data)
    } else {
console.log(` proccess else `)
      console.log(data)
    }
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
console.log(` proccess .catch `)
  })
