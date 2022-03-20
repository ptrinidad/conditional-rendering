import
  {
    Button,
    FormControl, FormLabel,
    Input, Select,
    Text,
    useToast,
    VStack
  } from "@chakra-ui/react";
import { Category, Pet } from "api/Pet";
import axios from "axios";
import { Form, Formik } from "formik";
import { Feature, On } from "lib/components/feature/Feature";
import useFeature from "lib/components/feature/useFeature";
import { useEffect, useState } from "react";
import * as Yup from "yup";

const petSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  quantity: Yup.number().required("Quantity is required"),
  category: Yup.number().required("Category is required"),
});

export default function EditForm({ pet }: { pet?: Pet }) {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  // TODO: THIS DOESN'T WORK. How do we do this while keeping it DRY?
  const editFeature = useFeature({
    id: "pet-edit",
    on: true
  });

  useEffect(() => {
    axios
      .get<Category[]>("http://localhost:8080/category/list")
      .then((data) => {
        setCategories(data.data);
      });
  }, []);
  // Formik form
  return (
    <Formik
      initialValues={{
        id: pet?.id,
        name: pet?.name,
        quantity: pet?.quantity,
        category: pet?.category?.id.toString(),
      }}
      validationSchema={petSchema}
      onSubmit={(values, { setSubmitting }) => {
        setSubmitting(true);
        const cat = categories.find((x) => x.id === parseInt(values.category!));
        (values.id ? axios.put : axios.post)("http://localhost:8080/pet", {
          ...values,
          category: cat,
        })
          .then(() => {
            toast({
              title: "Success",
              description: "Pet edited successfully",
              status: "success",
            });
          })
          .catch(() => {
            toast({
              title: "Error",
              description: "Error editing pet",
              status: "error",
            });
          })
          .finally(() => setSubmitting(false));
      }}
    >
      {({
        values,
        handleChange,
        handleBlur,
        handleSubmit,
        isSubmitting,
        errors,
      }) => (
        <Form style={{ width: "100%" }}>
          <VStack w="100%" spacing="30px">
            <FormControl variant="filled">
              <FormLabel>Name</FormLabel>
              <Input
                disabled={!editFeature}
                bg="white"
                name="name"
                value={values.name}
                onChange={handleChange}
                isInvalid={Boolean(errors.name)}
              />
              <Text color="red" textAlign="left">
                {errors.name}
              </Text>
            </FormControl>
            <FormControl>
              <FormLabel>Quantity</FormLabel>
              <Input
                name="quantity"
                disabled={!editFeature}
                bg="white"
                type="number"
                value={values.quantity}
                onChange={handleChange}
                isInvalid={Boolean(errors.quantity)}
              />
              <Text color="red" textAlign="left">
                {errors.quantity}
              </Text>
            </FormControl>
            <FormControl>
              <FormLabel>Category</FormLabel>
              <Select
                disabled={!editFeature}
                bg="white"
                name="category"
                value={values.category}
                onChange={handleChange}
                isInvalid={Boolean(errors.category)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category?.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Text color="red" textAlign="left">
                {errors.category}
              </Text>
            </FormControl>
            <Feature flags="pet-edit">
              <On>
                <Button
                  colorScheme="blue"
                  w="100%"
                  isLoading={isSubmitting}
                  type="submit"
                >
                  Save
                </Button>
              </On>
            </Feature>
          </VStack>
        </Form>
      )}
    </Formik>
  );
}