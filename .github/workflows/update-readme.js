const fs = require('fs');
const https = require('https');

// Function to fetch package data from Packagist
async function getPackageData(repo) {
    return new Promise((resolve, reject) => {
        const url = `https://packagist.org/packages/${repo}.json`;
        console.log(`Fetching data for ${repo} from ${url}`);
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const packageData = JSON.parse(data);
                        console.log(`Successfully fetched data for ${repo}, installs: ${packageData.package.downloads.total}`);
                        resolve(packageData);
                    } else {
                        console.log(`Package not found for ${repo}, status code: ${res.statusCode}`);
                        // If package not found on Packagist, return null
                        resolve(null);
                    }
                } catch (e) {
                    console.error(`Error parsing data for ${repo}: ${e.message}`);
                    resolve(null);
                }
            });
        }).on('error', (e) => {
            console.error(`Error fetching data for ${repo}: ${e.message}`);
            resolve(null); // Resolve with null on error to continue processing
        });
    });
}

// Function to format install count with commas
function formatNumber(num) {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '0';
}

// Generate community starter kits list with sorting by installs
async function createCommunityLists(communityListArray) {
    const communityKits = [];
    for (const kit of communityListArray) {
        const packageData = await getPackageData(kit.package);
        // Ensure installs is a number for proper sorting
        const installs = packageData && packageData.package && packageData.package.downloads ?
            parseInt(packageData.package.downloads.total, 10) : 0;
        communityKits.push({
            title: kit.title,
            package: kit.package,
            repo: kit.repo,
            installs: installs
        });
        console.log(`Added community kit: ${kit.title}, package: ${kit.package}, repo: ${kit.repo}, installs: ${installs}`);
    }

    // Sort community kits by installs (descending)
    communityKits.sort((a, b) => b.installs - a.installs);
    console.log('Sorted community kits:', JSON.stringify(communityKits, null, 2));

    // Generate the formatted list
    let communityListString = '';
    for (const kit of communityKits) {
        //<a href="https://herd.laravel.com/new?starter-kit=${kit.package}">\`launch with herd\`</a>
        communityListString += `* [${kit.title}](https://github.com/${kit.repo}) - \`${kit.package}\` <a href="https://packagist.org/packages/${kit.package}">💾 ${formatNumber(kit.installs)} installs</a> <a href="https://herd.laravel.com/new?starter-kit=${kit.package}" title="Install with Herd">🚀</a>\n`;
        
        
    }

    return communityListString;
}

// Main function to update README
async function updateReadme() {
    // Read templates.json
    const templates = JSON.parse(fs.readFileSync('templates.json', 'utf8'));

    // Read README_template.md as the template
    let readme = fs.readFileSync('README_template.md', 'utf8');
    console.log('Original README_template.md content:', readme);

    // Verify the template has been read correctly
    if (!readme || readme.trim() === '') {
        throw new Error('README_template.md is empty or could not be read');
    }

    // Log the first line to verify it contains "laravel new starter"
    const firstLine = readme.split('\n')[0];
    console.log('First line of README_template.md:', firstLine);

    // Generate official starter kits list with sorting by installs
    const officialKits = [];
    for (const kit of templates.official) {
        const packageData = await getPackageData(kit.package);
        // Ensure installs is a number for proper sorting
        const installs = packageData && packageData.package && packageData.package.downloads ?
            parseInt(packageData.package.downloads.total, 10) : 0;
        officialKits.push({
            title: kit.title,
            package: kit.package,
            repo: kit.repo,
            installs: installs
        });
        console.log(`Added official kit: ${kit.title}, package: ${kit.package}, repo: ${kit.repo}, installs: ${installs}`);
    }

    // Sort official kits by installs (descending)
    officialKits.sort((a, b) => b.installs - a.installs);
    console.log('Sorted official kits:', JSON.stringify(officialKits, null, 2));

    // Generate the formatted list
    let officialList = '';
    for (const kit of officialKits) {
        officialList += `\n- [${kit.title}](https://github.com/${kit.repo}) - \`${kit.package}\` - 💿 ${formatNumber(kit.installs)} installs \n\n\`\`\`\nlaravel new my-app --using=${kit.package}\n\`\`\`\n`;
    }

    // Replace placeholders in README
    const communityListBlade = await createCommunityLists(templates.community.blade)
    const communityListLivewire = await createCommunityLists(templates.community.livewire)
    const communityListReact = await createCommunityLists(templates.community.react)
    const communityListVue = await createCommunityLists(templates.community.vue)
    const communityListAPI = await createCommunityLists(templates.community.api)
    const communityListCMSOfficial = await createCommunityLists(templates.community.cms_official)
    const communityListCMSCommunity = await createCommunityLists(templates.community.cms_community)
    const communityListSAAS = await createCommunityLists(templates.community.saas)
    const communityListOther = await createCommunityLists(templates.community.other)

    console.log('Looking for placeholders in README_template...');
    console.log('README_template before replacement:', readme);

    // Use regex with global flag to ensure all occurrences are replaced
    readme = readme.replace(/\[OFFICIAL\]/g, officialList.trim());

    readme = readme.replace(/\[COMMUNITY_API\]/g, communityListAPI.trim());
    readme = readme.replace(/\[COMMUNITY_CMS_OFFICIAL\]/g, communityListCMSOfficial.trim());
    readme = readme.replace(/\[COMMUNITY_CMS_COMMUNITY\]/g, communityListCMSCommunity.trim());
    readme = readme.replace(/\[COMMUNITY_SAAS\]/g, communityListSAAS.trim());
    readme = readme.replace(/\[COMMUNITY_OTHER\]/g, communityListOther.trim());
    readme = readme.replace(/\[COMMUNITY_BLADE\]/g, communityListBlade.trim());
    readme = readme.replace(/\[COMMUNITY_LIVEWIRE\]/g, communityListLivewire.trim());
    readme = readme.replace(/\[COMMUNITY_REACT\]/g, communityListReact.trim());
    readme = readme.replace(/\[COMMUNITY_VUE\]/g, communityListVue.trim());

    console.log('Generated README content (excerpt):', readme.substring(0, 500) + '...');
    console.log('Official list generated:', officialList);

    console.log('Livewire list generated:', communityListLivewire);
    console.log('React list generated:', communityListReact);
    console.log('Vue list generated:', communityListVue);
    console.log('API list generated:', communityListAPI);
    console.log('Official CMS list generated:', communityListCMSOfficial);
    console.log('Community CMS list generated:', communityListCMSCommunity);
    console.log('SASS list generated:', communityListSAAS);
    console.log('Misc. list generated:', communityListOther);

    // Write updated README
    fs.writeFileSync('README.md', readme);

    // Verify the README.md was written correctly
    const writtenReadme = fs.readFileSync('README.md', 'utf8');
    console.log('First line of written README.md:', writtenReadme.split('\n')[0]);

    if (writtenReadme !== readme) {
        console.warn('WARNING: Written README.md does not match the generated content');
    }

    console.log('README.md has been updated with starter kits from templates.json');
}

// Verify README_template.md exists before running
if (!fs.existsSync('README_template.md')) {
    console.error('ERROR: README_template.md does not exist');
    process.exit(1);
}

// Run the update
updateReadme().catch(err => {
    console.error('Error updating README:', err);
    process.exit(1);
});
