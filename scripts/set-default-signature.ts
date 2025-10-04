import { db } from "../server/db";
import { users } from "../shared/schema";
import { sql } from "drizzle-orm";

const defaultSignature = `<br>
<div class="moz-signature">-- <br>
  <div class="moz-signature">
    <div class="moz-signature"><br>
      <div class="moz-signature">Kind Regards,<br><br>
        {USER_NAME}
        <div class="moz-signature">
          <div class="moz-signature">
            <div class="moz-signature">
              <div class="moz-signature">
                <div class="moz-signature">
                  <div class="moz-signature">
                    <div class="moz-signature">
                      <div class="moz-signature">
                        <div class="moz-signature">
                          <div class="moz-signature">
                            <div class="moz-signature">
                              <div class="moz-signature"><br>
                                <table style="border-collapse: collapse;" cellpadding="5" border="0">
                                  <tbody>
                                    <tr>
                                      <td style="vertical-align: top;"><img src="{LOGO_URL}" alt="R.S. International Freight Ltd" style="display: block;"><br>
                                      </td>
                                      <td style="vertical-align: top; padding-left: 10px;"><span style="color: #993366;"><em><strong>R.S. International Freight Ltd</strong></em></span><br>
                                        10b Hornsby Square, Southfields Business Park, Laindon, Essex, SS15 6SD<br>
                                        Telephone: +44 (0)1708 865000<br>
                                        Fax: +44 (0)1708 865010<br>
                                        <a href="http://www.rs-international.com">http://www.rs-international.com</a></td>
                                    </tr>
                                  </tbody>
                                </table>
                                <b><em><span style="color:red;"><br></span></em><span style="color:red;"><a href="http://rs-international.com/rs_terms_v4.pdf"><u>Please click here for our Tariff guide, authorisation forms, terms &amp; CDS Switchover information</u></a></span></b><b><em><span style="color:red;"><br></span></em></b></div>
                              <div class="moz-signature"><em><br></em></div>
                              <div class="moz-signature"><em>This email and the information it contains may be privileged and/or confidential. It is for the intended addressee(s) only. The unauthorised use, disclosure or copying of this email, or any information it contains is prohibited and could in certain circumstances be a criminal offence. If you are not the intended recipient, please notify the sender and delete the message from your system. RS International Freight Limited monitors emails to ensure its systems operate effectively and to minimise the risk of viruses. Whilst it has taken reasonable steps to scan this email, it does not accept liability for any virus that it may contain. All Business transacted subject the BIFA standard trading conditions 2017 edition.</em></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`;

async function setDefaultSignature() {
  console.log("Setting default signature for all users...");
  
  // Update all users who don't have a signature
  await db.update(users)
    .set({ 
      emailSignature: defaultSignature,
      includeSignature: true 
    })
    .where(sql`${users.emailSignature} IS NULL OR ${users.emailSignature} = ''`);
  
  console.log("Default signature set successfully!");
  process.exit(0);
}

setDefaultSignature().catch(console.error);
