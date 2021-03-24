#include <chrono>
#include <vector>
#include <cppgpio.hpp>
#include <array>
#include <algorithm>
#include <functional>
#include <node/node.h>
#include <node/node_object_wrap.h>

using namespace GPIO;
using namespace std;

vector<array<bool, 7>> nums = {
    {1, 1, 1, 1, 1, 1, 0},
    {0, 1, 1, 0, 0, 0, 0},
    {1, 1, 0, 1, 1, 0, 1},
    {1, 1, 1, 1, 0, 0, 1},
    {0, 1, 1, 0, 0, 1, 1},
    {1, 0, 1, 1, 0, 1, 1},
    {1, 0, 1, 1, 1, 1, 1},
    {1, 1, 1, 0, 0, 0, 0},
    {1, 1, 1, 1, 1, 1, 1},
    {1, 1, 1, 1, 0, 1, 1},
    {1, 0, 1, 0, 1, 1, 1},
    };

namespace display
{
    using v8::Array;
    using v8::Context;
    using v8::Exception;
    using v8::Function;
    using v8::FunctionCallbackInfo;
    using v8::FunctionTemplate;
    using v8::Isolate;
    using v8::Local;
    using v8::Number;
    using v8::Object;
    using v8::ObjectTemplate;
    using v8::String;
    using v8::Value;

    class Display : public node::ObjectWrap
    {
    public:
        static void Init(v8::Local<v8::Object> exports)
        {
            Isolate *isolate = exports->GetIsolate();
            Local<Context> context = isolate->GetCurrentContext();

            Local<ObjectTemplate> addon_data_tpl = ObjectTemplate::New(isolate);
            addon_data_tpl->SetInternalFieldCount(1); // 1 field for the Display::New()
            Local<Object> addon_data =
                addon_data_tpl->NewInstance(context).ToLocalChecked();

            // Prepare constructor template
            Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate, New, addon_data);
            tpl->SetClassName(String::NewFromUtf8(isolate, "Display").ToLocalChecked());
            tpl->InstanceTemplate()->SetInternalFieldCount(1);

            // Prototype
            NODE_SET_PROTOTYPE_METHOD(tpl, "show", Show);

            Local<Function> constructor = tpl->GetFunction(context).ToLocalChecked();
            addon_data->SetInternalField(0, constructor);
            exports->Set(context, String::NewFromUtf8(isolate, "Display").ToLocalChecked(),
                         constructor)
                .FromJust();
        }

    private:
        explicit Display(int num) : num_(num), point(25)
        {
            for (int i = 0; i < Digits.size(); i++)
            {
                digits.push_back(new DigitalOut(Digits[i]));
                digits[i]->on();
            }
            for (int i = 0; i < Segments.size(); i++)
            {
                segments.push_back(new DigitalOut(Segments[i]));
                segments[i]->off();
            }
        }
        ~Display() {}

        static void New(const FunctionCallbackInfo<Value> &args)
        {
            Isolate *isolate = args.GetIsolate();
            Local<Context> context = isolate->GetCurrentContext();

            if (args.IsConstructCall())
            {
                // Invoked as constructor: `new Display(...)`
                int value = args[0]->IsUndefined() ? 0 : (int)args[0]->NumberValue(context).FromMaybe(0);
                Display *obj = new Display(value);
                obj->Wrap(args.This());
                args.GetReturnValue().Set(args.This());
            }
            else
            {
                // Invoked as plain function `Display(...)`, turn into construct call.
                const int argc = 1;
                Local<Value> argv[argc] = {args[0]};
                Local<Function> cons =
                    args.Data().As<Object>()->GetInternalField(0).As<Function>();
                Local<Object> result =
                    cons->NewInstance(context, argc, argv).ToLocalChecked();
                args.GetReturnValue().Set(result);
            }
        }

        static void Show(const v8::FunctionCallbackInfo<v8::Value> &args)
        {
            Isolate *isolate = args.GetIsolate();

            Display *obj = ObjectWrap::Unwrap<Display>(args.Holder());

            if (args.Length() < 1)
            {
                // Throw an Error that is passed back to JavaScript
                isolate->ThrowException(Exception::TypeError(
                    String::NewFromUtf8(isolate,
                                        "Wrong number of arguments")
                        .ToLocalChecked()));
                return;
            }

            // Check the argument types
            if (!args[0]->IsNumber())
            {
                isolate->ThrowException(Exception::TypeError(
                    String::NewFromUtf8(isolate,
                                        "Wrong arguments")
                        .ToLocalChecked()));
                return;
            }

            bool showPoint = args[1]->IsUndefined() ? 0 : args[1]->BooleanValue(isolate);
            bool showK = args[2]->IsUndefined() ? 0 : args[2]->BooleanValue(isolate);

            // Perform the operation
            double value = args[0].As<Number>()->Value();
            obj->num_ = (int)value;

            int number[] = {1, 2, 3, 4};

            if(showK) {
                number[3] = 10;
                number[2] = (int)((obj->num_ / 1000) % 10);
                number[1] = (int)((obj->num_ / 10000) % 10);
                number[0] = (int)((obj->num_ / 100000) % 10);
            } else {
                number[3] = (int)obj->num_ % 10;
                number[2] = (int)((obj->num_ / 10) % 10);
                number[1] = (int)((obj->num_ / 100) % 10);
                number[0] = (int)((obj->num_ / 1000) % 10);
            }
            for (int i = 0; i < 4; i++)
            {
                // proms.push(digits[i].write(0));
                for (int j = 0; j < 7; j++)
                {
                    if (nums[number[i]][j])
                        obj->segments[j]->on();
                    else
                        obj->segments[j]->off();
                }
                if (showPoint)
                    obj->point.on();
                else
                    obj->point.off();
                obj->digits[i]->off();
                std::this_thread::sleep_for(std::chrono::milliseconds(1));
                obj->digits[i]->on();
            }

            args.GetReturnValue().SetUndefined();
        }

        array<int, 4> Digits = {22, 27, 17, 24};
        vector<DigitalOut *> digits;

        array<int, 7> Segments = {11, 4, 23, 8, 7, 10, 18};
        vector<DigitalOut *> segments;

        DigitalOut point;
        int num_;
    };

    void InitAll(Local<Object> exports)
    {
        Display::Init(exports);
    }

    NODE_MODULE(NODE_GYP_MODULE_NAME, InitAll)

} // namespace demo