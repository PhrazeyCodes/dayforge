const https = require('https');

const TELLER_CERT = `-----BEGIN CERTIFICATE-----
MIIExjCCAq6gAwIBAgIIGJq7yWWbw1QwDQYJKoZIhvcNAQELBQAwYTELMAkGA1UE
BhMCR0IxEDAOBgNVBAgMB0VuZ2xhbmQxDzANBgNVBAcMBkxvbmRvbjEPMA0GA1UE
CgwGVGVsbGVyMR4wHAYDVQQLDBVUZWxsZXIgQXBwbGljYXRpb24gQ0EwHhcNMjYw
MzA4MDIxMTE2WhcNMjkwMzA3MDIxMTE2WjAkMSIwIAYDVQQDDBlhcHBfcHBpcG1i
NHIxNHZzOGdpYmpjMDAwMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
7OhBj4eYtKVJZ8Wf7TITX9X6Bm+w7fGq1QtdRjPbhFN6wNulx35DUJqzSz3GYWP1
udyG1y0Fr62TSp8w1pDtFOHdZzNKUeLMHl/qUoKfL7DwT2gMZ8p1kYg3szxxph0v
KFdeWL8RzMtYznzkyT9QvvROGyHTEqs/yI2l11pSC0RmopGp6ya0wP/H4hmN4Sfy
+Z2PHnEmEcECvxVIIa+tuS2w/NA8bAaULmobLqbNK88TOE4SAUu2BaSIL3j9Q1Yp
tGnLfkIGY+I8ac0TNr7aq4SJ4e4ZwzJkmS7nmyPxyDdqxDODNhHsoffqBKNQ/D0a
3yI2JrP0hDAm8+bRQfjyCQIDAQABo4G+MIG7MA4GA1UdDwEB/wQEAwIF4DATBgNV
HSUEDDAKBggrBgEFBQcDAjCBkwYDVR0jBIGLMIGIgBSEq++simSLxXkuNSUKjel6
pmhxmqFlpGMwYTELMAkGA1UEBhMCR0IxEDAOBgNVBAgMB0VuZ2xhbmQxDzANBgNV
BAcMBkxvbmRvbjEPMA0GA1UECgwGVGVsbGVyMR4wHAYDVQQLDBVUZWxsZXIgQXBw
bGljYXRpb24gQ0GCCQDiNWG/vm85CTANBgkqhkiG9w0BAQsFAAOCAgEALODhW85y
AF6zBj0XYaWxebgta3YU0IIDixr0AWVn5hNWgOgYYsTBpMQfgCzRvnI63BfHccvs
uN0R6NOLJGxY2SOcGzKZpCPcwRNQqTIcK/eseSgaI+Sg5MEIMdTNIH0Y+5XtFdhu
YArdXVvvojfgrbDbcQO4UR5LgYIf0ddhjchXa9wQztLtIRJsH4Gth+oOLP+J+WHk
79V4o3a90id0j+FGzfjqMktT3ACr56/gqiloX4TECpFezjoR6ERjaZ35SWEVPJlV
7eLLa/wD1AZ/PcLeBh6SHDDf7IzSlLTRBi1IrHTGM0GrHvKgk8MqeYTZyvfAlzzS
Subh/NK32JRnhcsXb2m1fPxWhdRVDgqTtuu8E8WoRIyJno3HIu5s/A0LtnZ/OaxN
96faxBolsJWMbjQ6xxN8SCQW+tSoHURkhULe9CxKELF6mgFrFrVhV0KVWV3CacsN
LnktXHvNral6z68JId0hKuYv5DFz8Y7NWq38nhuwlm4vbMgrxTA6L2lXL6TJ2gWT
njtuBu2sq5udKS3EKtv+5iF2626pJZHCVHiaCKKimE0vNBYiZStgKcpGxdOGoOQt
rT5hpIYtpH4+nKG4hyGAnT7Q+bsa8zPwI3t/XKMoLaPufQ6U+t1Vqnrzpi5TUmCb
/ssqIyBXUYcXYC/agRmt410imjbc1W4KVLc=
-----END CERTIFICATE-----`;

const TELLER_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDs6EGPh5i0pUln
xZ/tMhNf1foGb7Dt8arVC11GM9uEU3rA26XHfkNQmrNLPcZhY/W53IbXLQWvrZNK
nzDWkO0U4d1nM0pR4sweX+pSgp8vsPBPaAxnynWRiDezPHGmHS8oV15YvxHMy1jO
fOTJP1C+9E4bIdMSqz/IjaXXWlILRGaikanrJrTA/8fiGY3hJ/L5nY8ecSYRwQK/
FUghr625LbD80DxsBpQuahsups0rzxM4ThIBS7YFpIgveP1DVim0act+QgZj4jxp
zRM2vtqrhInh7hnDMmSZLuebI/HIN2rEM4M2Eeyh9+oEo1D8PRrfIjYms/SEMCbz
5tFB+PIJAgMBAAECggEAHYN3u25Ml2CqCuwDVvTwlfVdzxR2CcacHitqxNasB8mw
lrsmZXp032NOZ9a70qE12SBAiij5NuAcY+T+HBT0/C+BOhyZKydif3w6gGn2c+YK
ohHXzcxapjU+ny0uCWBEYjW0MsEm8gj5OMw1Yl7pa8iavGWT2pUL/quq1+/QHcf7
1rzpxPkVT06tz1iuJHgbNw17SyXBcH1HWJ5iUUEc6PQ0MORwJNQDUJE5lr15jvA8
mVPYICxMWru8xNGMfiDIw6quPJ/lKGtUCPBz1wAMSJJrqbRtatvVQBeoX0/nD/oJ
pgw/kjR4e0KoPLzlJvRtWVQzMwCugghBL7HgUqsASQKBgQD3xD79UBJ/ViYXRgN9
tdAqlvsvaY4ZSd2rjEsFlb0oPfiKpAKWKAxRMBTrtSZTqdAFJwXHdIVxB1JZe6RA
iItOzSL8prRgGqsSCG2Du+maTaBd4fVfbyP5lYO17l8HQ6uuNt7TDUMq19IA0qDU
fUzxp9UGGAz3qxPXpCVG8dZEXQKBgQD0x6En/gZrTgkEV9d+fPPtGOlyA5ZKHqQm
NYLBnAjnZtK4mbhnuBjMF4KBK/1ab/04MPf551SzLMFaOMhzrpop65LxCoBgntTa
QmEGgX/gur5Vmrj+lGu6VG1UyzDcSUgBV8N6av9OBM82tXZk++7xvZQw2bZyDB4L
DYAz7zTJnQKBgAWpzK7Jl8KlW3WIuiezcjCnBtLMnNzjHVgAeu6Dv7EdyYKRwSVh
gPaSHMhOebPL299iRvWKKkqtGirFcrmu5VBFzBjuTo0rzuE4pBgwwWQvhgzfT1aB
GddonXwZGL73wwLWaj10viZKjJhMODTjMFENvwbGofU/SdLSA7AdcwJZAoGBAM/p
aJdBi05FoB8SRbXoiIARMuhm55bZY/AYb5Hn6SA0FDQ8TYe7tURVi8IQDUht6xV5
cofP1//AuhLaPFkWK1gEAnG+y8BF6OHik+skv+uwcs7fdta2VrKT17G4TS4vCHwr
gZxPmb85EpCTnZa07wZiUqcTpYZFiJc2xmJA7gN5AoGBALw7W/+Uij/RFoTz+Jnq
MnYP+zVt/FA+rQt5f072EuGP9n7tjYk510j0NmGAVuMbmnv1Hyy9FLCwEhZ2SMzy
G5v6Bpb41iKQs8fJxS7gTE8nK2N3ZcBPbl55PPBtVRR+apAhHKR+jhLANByoY2vQ
3g122g/0/ilq6dalILE67thu
-----END PRIVATE KEY-----`;

function mapCategory(tellerCategory) {
  const cat = (tellerCategory || '').toLowerCase();
  if (cat.includes('home') || cat.includes('rent') || cat.includes('utilities')) return 'Housing';
  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('coffee') || cat.includes('groceries')) return 'Food';
  if (cat.includes('transport') || cat.includes('travel') || cat.includes('gas') || cat.includes('parking') || cat.includes('rideshare')) return 'Transport';
  if (cat.includes('shop') || cat.includes('retail') || cat.includes('clothing')) return 'Shopping';
  if (cat.includes('health') || cat.includes('medical') || cat.includes('pharmacy') || cat.includes('fitness')) return 'Health';
  if (cat.includes('entertainment') || cat.includes('streaming') || cat.includes('music') || cat.includes('games')) return 'Entertainment';
  if (cat.includes('income') || cat.includes('payroll') || cat.includes('deposit')) return 'income';
  return 'Other';
}

function tellerGet(path, accessToken) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(accessToken + ':').toString('base64');
    const agent = new https.Agent({ cert: TELLER_CERT, key: TELLER_KEY });
    const req = https.request({
      hostname: 'api.teller.io',
      path,
      method: 'GET',
      agent,
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/json',
        'Teller-Version': '2020-10-12',
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error('Failed to parse Teller response')); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch (e) { return res.status(400).json({ error: 'Invalid JSON body' }); }
  }

  const { access_token } = body;
  if (!access_token) return res.status(400).json({ error: 'access_token is required' });

  try {
    const accountsRes = await tellerGet('/accounts', access_token);
    if (accountsRes.status !== 200) {
      return res.status(accountsRes.status).json({ error: accountsRes.body.error?.message || 'Failed to fetch accounts' });
    }

    const accounts = accountsRes.body;
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return res.status(200).json({ transactions: [], count: 0 });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const allTransactions = [];

    for (const account of accounts) {
      try {
        const txRes = await tellerGet(`/accounts/${account.id}/transactions`, access_token);
        if (txRes.status === 200 && Array.isArray(txRes.body)) {
          for (const tx of txRes.body) {
            if (new Date(tx.date) < cutoff) continue;
            const amount = parseFloat(tx.amount);
            const isIncome = amount > 0;
            const dfCat = mapCategory(tx.details?.category || '');
            allTransactions.push({
              id: Date.now() + Math.random(),
              name: tx.description || tx.details?.counterparty?.name || 'Transaction',
              type: isIncome ? 'income' : 'expense',
              cat: isIncome ? 'Other' : dfCat,
              amount: Math.abs(amount),
              date: tx.date,
              note: tx.details?.counterparty?.name && tx.details.counterparty.name !== tx.description ? tx.details.counterparty.name : '',
              tellerId: tx.id,
              accountName: account.name || (account.last_four ? `…${account.last_four}` : ''),
            });
          }
        }
      } catch (err) {
        console.error(`Account ${account.id} error:`, err.message);
      }
    }

    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    return res.status(200).json({ transactions: allTransactions, count: allTransactions.length });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
