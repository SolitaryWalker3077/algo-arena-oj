package com.oj.security.handler;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.oj.common.entity.Result;
import com.oj.common.enums.ResultCode;
import com.oj.security.expection.ServiceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.validation.BindException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Collection;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;



/**
 * 全局异常处理
 * */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 请求方式不支持
     *
     * */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public Result<?> handleHttpRequestMethodNotSupported(HttpRequestMethodNotSupportedException e,
                                                         HttpServletRequest request) {
        String requestURI = request.getRequestURI();
        log.error("请求地址'{}',不⽀持'{}'请求", requestURI, e.getMethod());
        return Result.fail(ResultCode.ERROR);
    }


    @ExceptionHandler(ServiceException.class)
    public Result<?> handleServiceException(ServiceException e,HttpServletRequest request) {
        String requestURI = request.getRequestURI();
        ResultCode resultCode = e.getResultCode();
        log.error("请求地址'{}',发生业务异常: {}", requestURI, resultCode.getMsg(), e);
        return Result.fail(resultCode);
    }


    /**
     *拦截运行异常
     * */
    @ExceptionHandler(RuntimeException.class)
    public Result<?> handleRuntimeException(RuntimeException e,HttpServletRequest request) {
        String requestURI = request.getRequestURI();
        log.error("请求地址'{}',发⽣异常.", requestURI, e);
        return Result.fail(ResultCode.ERROR);
    }

    /**
     * 系统异常
     */
    @ExceptionHandler(Exception.class)
    public Result<?> handleException(Exception e,HttpServletRequest request) {
        String requestURI = request.getRequestURI();
        log.error("请求地址'{}',发生异常",requestURI,e);
        return Result.fail(ResultCode.ERROR);
    }


    /**
     * 处理请求参数绑定或参数校验失败产生的异常。
     *
     * <p>例如，请求参数无法转换成 DTO 字段类型，或者 DTO 字段没有通过
     * {@code @NotBlank}、{@code @Size} 等 Jakarta Validation 注解的校验时，
     * Spring 会将所有绑定/校验错误保存到 {@link BindException} 中。</p>
     *
     * @param e Spring 参数绑定异常，其中包含本次请求的所有字段错误和对象错误
     * @return 参数校验失败的统一响应，message 为所有校验提示以逗号分隔后的结果
     */
    @ExceptionHandler(BindException.class)
    public Result<Void> handleBindException(BindException e) {
        log.error(e.getMessage());

        // getAllErrors() 取得全部校验错误；方法引用负责从每个错误中提取默认提示语。
        // join 会过滤掉 null 提示，并使用 ", " 将剩余提示拼成一个字符串。
        String message = join(e.getAllErrors(),
                DefaultMessageSourceResolvable::getDefaultMessage, ", ");
        return Result.fail(ResultCode.FAILED_PARAMS_VALIDATE.getCode(), message);

    }

    /**
     * 把集合中的元素转换为字符串后，使用指定分隔符连接起来。
     *
     * @param collection 待处理的元素集合
     * @param function   元素到字符串的转换函数，例如错误对象到错误提示语
     * @param delimiter  相邻字符串之间的分隔符
     * @param <E>        集合元素类型
     * @return 拼装后的字符串；集合为空时返回空字符串
     */
    private <E> String join(Collection<E> collection, Function<E, String>
            function, CharSequence delimiter) {
        if (CollUtil.isEmpty(collection)) {
            return StrUtil.EMPTY;
        }
        return collection.stream()
                // 将每个 E 转换成需要参与拼装的字符串。
                .map(function)
                // 避免 null 被当作文本拼入最终结果。
                .filter(Objects::nonNull)
                // 按元素原有顺序，在相邻字符串之间插入 delimiter。
                .collect(Collectors.joining(delimiter));
    }


}
