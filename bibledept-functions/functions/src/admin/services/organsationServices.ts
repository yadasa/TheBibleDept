import { firestore } from 'firebase-admin'
import collections from '../../types/collections'

export const getOrganisationInfo = async (orgId: string) => {
  let result: BibleDept.Organisation = {} as BibleDept.Organisation

  if (!orgId) return result

  const orgQuery:
    | FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
    | FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = firestore()
    .collection(collections.ORGANISATIONS)
    .doc(orgId)

  const OrgRef = await orgQuery.get()
  result = OrgRef.data() as BibleDept.Organisation
  return result
}

export default { getOrganisationInfo }
