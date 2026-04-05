from sqlalchemy.orm import Session
from app.models.users import User
from app.models.user_preference import UserPreference
from app.models.post import Category  # ← نموذج الفئة
from typing import Optional, List
from ..core.security import hash_password, verify_password


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """مصادقة بسيطة (كلمة المرور كـ plain text)"""
    users = db.query(User).filter(User.email == email).first()
    if not users:
        return None 
    if not verify_password(password, users.password):
        return None
    return users


def register_user(
    db: Session,
    email: str,
    password: str,
    full_name: Optional[str] = None,
    phone: Optional[str] = None,
    selected_category_name: Optional[str] = None  # اسم الفئة المختارة
) -> bool:
    """
    تحديث بيانات المستخدم:
    - full_name, phone → في جدول User
    - category_id → في جدول UserPreference
    """
    users = db.query(User).filter(User.email == email).first()
    if not users:
        return False

    # 1. تحديث بيانات المستخدم الأساسية
    users.password = hash_password(password)
    if full_name is not None:
        users.full_name = full_name
    if phone is not None:
        users.phone = phone

    # 2. البحث عن category_id من اسم الفئة
    "شراكه اكاديميه بين جامعه عين شمس و مؤسسه مودرن جروب الجامعيه. في اطار رؤيه الدوله وتوجهاتها نحو تعزيز الشراكه الفاعله بين القطاعين العام والخاص ودعم التوسعات المتناميه في منظومه التعليم الجامعي وقعت جامعه عين شمس مذكره تعاون مشترك مع مؤسسه مودرن جروب المستضيفه لفرعي جامعه سان بطرسبرج وجامعه كازان الفيدراليه الروسيتين بالقاهره تعزيزا لجوده العمليه التعليميه وتطوير البحث العلمي وخدمه المجتمع مع الحفاظ على المعايير الاكاديميه العالميه. وقع مذكره التفاهم الاستاذ الدكتور محمد ضياء زين العابدين رئيس جامعه عين شمس والدكتور وليد نبيل دعبس رئيس مجلس اداره مؤسسه مودرن جروب التي تضم الجامعه الحديثه للتكنولوجيا والمعلومات وفرعي جامعه سان بطرسبرج وجامعه كازان الفيدراليه الروسيتين بالقاهره. جاء التوقيع بحضور الاستاذه الدكتوره اماني اسامه كامل نائب رئيس الجامعه لشئون الدراسات العليا والبحوث والاستاذ الدكتور رامي ماهر نائب رئيس الجامعه لشئون التعليم والطلاب والاستاذ الدكتور علي الانور عميد كليه الطب والاستاذ الدكتور ايمن شافعي رئيس جامعتي سان بطرسبرج الروسيه بالقاهره وكازان الفيدراليه الروسيه بالقاهره والاستاذه الدكتوره شيرين وجيه عبد الملك نائب رئيس الجامعتين. وتهدف المذكره الى ارساء قواعد منظومه ابتكاريه متكامله في مجالات التعليم والبحث العلمي ونشر المعرفه وخدمه المجتمع بما يعزز التكامل بين القطاعين العام والخاص في منظومه التعليم العالي. كما تشمل تقديم الدعم المادي لجامعه عين شمس وبخاصه كليه الطب وتطوير مستشفياتها واتخاذ الاجراءات اللازمه لاعلان مؤسسه مودرن جروب راعيا رئيسيا للخدمه المجتمعيه بالجامعه. وتتضمن المذكره اتاحه فرص تدريب لطلاب مؤسسه مودرن جروب في مرحله ما قبل التخرج من الدارسين بفروع الجامعات الاجنبيه المستضافه من خلال المؤسسه الى جانب طلاب كليه الطب بالجامعه الحديثه للتكنولوجيا والمعلومات وذلك داخل مستشفيات جامعه عين شمس فضلا عن تدريب طلاب كليات المؤسسه في بعض معامل كليات جامعه عين شمس. كما يشمل التعاون دعم تنميه المهارات البحثيه للطلاب من خلال مشاركتهم في مشروعات بحثيه ذات تنافسيه عالميه تجمع بين فروع الجامعات الروسيه ووحدات الابحاث المختلفه بجامعه عين شمس ومركز الابحاث المصري بكليه الطب. وتنص المذكره كذلك على اداره منظومه ابتكاريه لمشاركه اعضاء هيئه التدريس من كليات جامعه عين شمس خاصه في القطاعات الطبيه والانسانيه والذكاء الاصطناعي والعلوم جنبا الى جنب مع نظرائهم من دوله روسيا الاتحاديه في تدريس المقررات والبرامج التي تطرحها فروع الجامعات الروسيه بالقاهره وفقا للمعايير المعتمده من الفيدراليه الروسيه بما يعزز تبادل الخبرات التعليميه بين الجانبين. كما يشمل التعاون تسجيل برامج دراسات عليا ذات اشراف مشترك بين جامعه عين شمس وجامعات مؤسسه مودرن جروب بما يسهم في تنميه مهارات الموارد البشريه من اعضاء الهيئه المعاونه والفنيين الى جانب التعاون في تنظيم القوافل الطبيه والانشطه والخدمات المجتمعيه المشتركه",
    category_ids = []
    for cat_name in selected_category_name:
        category = db.query(Category).filter(Category.name == cat_name).first()
        if category:
            category_ids.append(category.category_id)

    # جلب الفئات الحالية للمستخدم
    existing_prefs = db.query(UserPreference).filter(UserPreference.user_id == users.user_id).all()
    existing_category_ids = {pref.category_id for pref in existing_prefs}

    # إضافة الفئات الجديدة فقط (غير الموجودة مسبقًا)
    for cat_id in category_ids:
        if cat_id not in existing_category_ids:
            new_pref = UserPreference(user_id=users.user_id, category_id=cat_id)
            db.add(new_pref)

    db.commit()
    db.refresh(users)
    return True


def get_user_role(db: Session, email: str) -> Optional[int]:
    users = db.query(User).filter(User.email == email).first()
    return users.role_id if users else None